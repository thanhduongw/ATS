"""
Scoring Engine — Phase 5, Task 5.4.

Core RAG-based scoring: for each benchmark criterion, retrieve
relevant CV chunks via vector search, then call LLM for evaluation.

Pipeline per criterion:
    1. retrieve_for_criterion() → top-3 chunks
    2. Build blind scoring prompt (no candidate PII)
    3. LLM structured output → CriterionEvaluation
    4. Guardrail validation (Task 5.5)
    5. Merge into CriterionScore
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm_client import LLMError, LLMUsage, get_llm_manager
from app.schemas.cv_extraction import ExtractedCV
from app.schemas.jd_generation import BenchmarkCriterion
from app.schemas.scoring import (
    CriterionEvaluation,
    CriterionScore,
    CriterionStatus,
)
from app.services.prompts.scoring import build_scoring_prompt
from app.services.retrieval_service import retrieve_for_criterion

logger = logging.getLogger(__name__)

# Evidence absence marker used by the LLM
_NO_EVIDENCE_MARKER = "Không tìm thấy thông tin liên quan trong CV"


# ============================================================
# Guardrail Validation (Task 5.5)
# ============================================================

@dataclass
class GuardrailResult:
    """Result of guardrail checks on a single criterion evaluation."""
    evaluation: CriterionEvaluation
    warnings: list[str] = field(default_factory=list)
    overridden: bool = False


def _run_guardrails(
    evaluation: CriterionEvaluation,
    chunk_texts: list[str],
) -> GuardrailResult:
    """Validate a single LLM evaluation against guardrail rules.

    Checks:
    1. Score bounds (0-100) — Pydantic already enforces, but double-check
    2. Evidence not empty / too short
    3. Contradiction: no evidence but PASS status
    4. Bias: evidence contains person names (regex)
    5. Substring verify: evidence exists in source chunks

    Args:
        evaluation: The LLM's criterion evaluation.
        chunk_texts: Raw text of the retrieved chunks for substring matching.

    Returns:
        GuardrailResult with potentially modified evaluation and warnings.
    """
    warnings: list[str] = []
    score = evaluation.score
    status = evaluation.status
    evidence = evaluation.evidence

    # 1. Score bounds (safety net)
    if score < 0:
        score = 0
        warnings.append("Score bị clamp từ giá trị âm về 0")
    elif score > 100:
        score = 100
        warnings.append(f"Score bị clamp từ {evaluation.score} về 100")

    # 2. Evidence quality
    if not evidence or len(evidence.strip()) < 10:
        warnings.append("Evidence quá ngắn hoặc rỗng")

    # 3. Contradiction check
    # Only match the exact marker string that the scoring prompt instructs the LLM
    # to write when no evidence is found. Broad checks ("không tìm thấy", "not found")
    # caused false positives, e.g. "Không tìm thấy lỗi trong code review" was
    # incorrectly treated as "no evidence found".
    is_no_evidence = _NO_EVIDENCE_MARKER.lower() in evidence.lower()
    if is_no_evidence and status == CriterionStatus.PASS:
        status = CriterionStatus.FAIL
        score = min(score, 30)
        warnings.append(
            "Guardrail: Evidence cho biết 'Không tìm thấy' nhưng status là PASS "
            "→ override thành FAIL"
        )

    # 4. Bias check — detect person names in evidence
    #    Simple heuristic: Vietnamese full names (2-4 capitalized words)
    name_pattern = r"\b[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+){2,3}\b"
    name_matches = re.findall(name_pattern, evidence)
    if name_matches:
        warnings.append(
            f"Bias check: Evidence có thể chứa tên người: {name_matches}"
        )

    # 5. Substring verification
    if not is_no_evidence and chunk_texts:
        combined_chunks = " ".join(chunk_texts).lower()
        # Take the core of the evidence (first 50 chars) and check
        evidence_core = evidence.strip()[:80].lower()
        if len(evidence_core) > 15 and evidence_core not in combined_chunks:
            warnings.append(
                "Guardrail: Evidence không phải substring của chunk gốc — "
                "có thể LLM đã bịa (hallucination)"
            )

    # Build corrected evaluation
    corrected = CriterionEvaluation(
        score=score,
        status=status,
        evidence=evaluation.evidence,
        gap_analysis=evaluation.gap_analysis,
        reasoning=evaluation.reasoning,
    )

    return GuardrailResult(
        evaluation=corrected,
        warnings=warnings,
        overridden=(score != evaluation.score or status != evaluation.status),
    )


# ============================================================
# Scoring Engine
# ============================================================

@dataclass
class ScoringResult:
    """Result of scoring all criteria for a single application."""
    criteria_scores: list[CriterionScore]
    total_usage: LLMUsage
    guardrail_warnings: list[str]


async def score_application(
    session: AsyncSession,
    application_id: int,
    job_posting_id: int,
    extracted_cv: ExtractedCV,
    criteria: list[BenchmarkCriterion],
) -> ScoringResult:
    """Score an application against all benchmark criteria using RAG.

    For each criterion:
    1. Retrieve top-3 relevant CV chunks (vector search)
    2. Build blind scoring prompt
    3. LLM structured output → CriterionEvaluation
    4. Guardrail validation
    5. Compute weighted score

    Args:
        session: Async DB session for vector retrieval.
        application_id: The application to score.
        job_posting_id: Job posting (for logging).
        extracted_cv: Structured CV data (for context, not sent to LLM).
        criteria: Benchmark criteria from JD generation.

    Returns:
        ScoringResult with all criterion scores, usage, and warnings.
    """
    start = time.monotonic()
    manager = get_llm_manager()
    criteria_scores: list[CriterionScore] = []
    all_warnings: list[str] = []

    # Accumulate total token usage
    total_input_tokens = 0
    total_output_tokens = 0
    total_cost = 0.0
    scoring_model = ""

    for idx, criterion in enumerate(criteria):
        criterion_start = time.monotonic()
        criterion_name = criterion.name
        requirement = criterion.standard_requirement

        logger.info(
            "Scoring criterion %d/%d: '%s' (weight=%d, must_have=%s) "
            "for application_id=%d",
            idx + 1, len(criteria), criterion_name,
            criterion.weight, criterion.is_must_have,
            application_id,
        )

        try:
            # Step 1: Retrieve relevant chunks
            similar_chunks = await retrieve_for_criterion(
                session=session,
                criterion_text=f"{criterion_name}: {requirement}",
                application_id=application_id,
                top_k=3,
            )

            chunk_dicts = [
                {
                    "chunk_type": chunk.chunk_type,
                    "content": chunk.content,
                }
                for chunk in similar_chunks
            ]
            chunk_texts = [chunk.content for chunk in similar_chunks]

            # Step 2: Build blind scoring prompt
            system_prompt, user_prompt = build_scoring_prompt(
                criterion_name=criterion_name,
                standard_requirement=requirement,
                chunks=chunk_dicts,
            )

            # Step 3: LLM structured output
            evaluation, usage = await manager.generate_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=CriterionEvaluation,
            )

            # Track usage
            total_input_tokens += usage.input_tokens
            total_output_tokens += usage.output_tokens
            total_cost += usage.estimated_cost_usd
            if not scoring_model:
                scoring_model = usage.model

            # Step 4: Guardrail validation
            guardrail = _run_guardrails(evaluation, chunk_texts)
            evaluation = guardrail.evaluation

            if guardrail.warnings:
                prefixed = [
                    f"[{criterion_name}] {w}" for w in guardrail.warnings
                ]
                all_warnings.extend(prefixed)
                logger.warning(
                    "Guardrail warnings for criterion '%s': %s",
                    criterion_name, guardrail.warnings,
                )

        except LLMError as e:
            # LLM failed — fallback to score 0
            logger.error(
                "LLM failed for criterion '%s' (app=%d): %s",
                criterion_name, application_id, e,
            )
            evaluation = CriterionEvaluation(
                score=0,
                status=CriterionStatus.FAIL,
                evidence="Lỗi kỹ thuật khi đánh giá tiêu chí này",
                gap_analysis="Không thể đánh giá do lỗi hệ thống",
                reasoning=f"LLM error: {str(e)[:200]}",
            )
            all_warnings.append(
                f"[{criterion_name}] LLM error — fallback score = 0"
            )

        # Step 5: Compute weighted score and build CriterionScore
        weighted = evaluation.score * criterion.weight / 100.0

        criterion_score = CriterionScore(
            name=criterion_name,
            weight=criterion.weight,
            category=criterion.category.value,
            isMustHave=criterion.is_must_have,
            standardRequirement=requirement,
            raw_score=evaluation.score,
            weighted_score=round(weighted, 2),
            status=evaluation.status,
            evidence=evaluation.evidence,
            gapAnalysis=evaluation.gap_analysis,
            reasoning=evaluation.reasoning,
        )
        criteria_scores.append(criterion_score)

        elapsed_criterion = int((time.monotonic() - criterion_start) * 1000)
        logger.info(
            "Criterion '%s' scored: raw=%d, weighted=%.2f, status=%s (%d ms)",
            criterion_name, evaluation.score, weighted,
            evaluation.status.value, elapsed_criterion,
        )

    elapsed_total = int((time.monotonic() - start) * 1000)
    logger.info(
        "Scoring complete for application_id=%d: %d criteria, "
        "%d input_tokens, %d output_tokens, $%.4f, %d ms",
        application_id, len(criteria),
        total_input_tokens, total_output_tokens,
        total_cost, elapsed_total,
    )

    return ScoringResult(
        criteria_scores=criteria_scores,
        total_usage=LLMUsage(
            model=scoring_model,
            input_tokens=total_input_tokens,
            output_tokens=total_output_tokens,
            estimated_cost_usd=total_cost,
            latency_ms=elapsed_total,
        ),
        guardrail_warnings=all_warnings,
    )
