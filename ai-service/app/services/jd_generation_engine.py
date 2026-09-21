"""
JD Generation Engine — Phase 3.

Orchestrates LLM calls for:
1. JD Generation: title/skills/level → structured JD (overview, responsibilities, requirements, benefits)
2. Benchmark Criteria Generation: JD text → 4-5 evaluation criteria with weights

Validation (task 3.3):
- sum(weights) == 100 — auto-normalize if off
- len(responsibilities) >= 3
- cosine similarity between responsibilities < 0.85 (detect duplicates)
"""

from __future__ import annotations

import logging
import time
from difflib import SequenceMatcher

from app.core.llm_client import LLMError, get_llm_manager
from app.schemas.jd_generation import (
    BenchmarkCriterion,
    BenchmarkGenerateRequest,
    BenchmarkGenerateResponse,
    BenchmarkResult,
    GeneratedJD,
    JDGenerateRequest,
    JDGenerateResponse,
    JDProvenance,
)
from app.services.prompts.jd_generation import (
    PROMPT_VERSION,
    build_benchmark_generation_prompt,
    build_jd_generation_prompt,
)

logger = logging.getLogger(__name__)


# ============================================================
# Validation helpers (task 3.3)
# ============================================================

def _normalize_weights(criteria: list[BenchmarkCriterion]) -> list[BenchmarkCriterion]:
    """Ensure sum(weights) == 100. Auto-normalize if off.

    Strategy: proportionally adjust all weights, rounding to integers,
    then fix any remainder by adjusting the largest-weight criterion.
    """
    total = sum(c.weight for c in criteria)
    if total == 100:
        return criteria

    logger.warning("Benchmark weights sum to %d (expected 100). Auto-normalizing.", total)

    if total == 0:
        # Edge case: all weights are 0 → distribute evenly
        even = 100 // len(criteria)
        remainder = 100 - even * len(criteria)
        for i, c in enumerate(criteria):
            c.weight = even + (1 if i < remainder else 0)
        return criteria

    # Proportionally scale
    scaled = []
    for c in criteria:
        c.weight = round(c.weight * 100 / total)
        scaled.append(c)

    # Fix rounding error
    diff = 100 - sum(c.weight for c in scaled)
    if diff != 0:
        # Adjust the criterion with the largest weight
        largest = max(scaled, key=lambda c: c.weight)
        largest.weight += diff

    return scaled


def _check_duplicate_responsibilities(
    responsibilities: list[str],
    threshold: float = 0.85,
) -> list[tuple[int, int, float]]:
    """Detect duplicate responsibilities using sequence similarity.

    Uses SequenceMatcher (similar to cosine similarity for short texts)
    as a lightweight alternative that doesn't require embedding model.

    Returns list of (index_i, index_j, similarity) for duplicates.
    """
    duplicates = []
    for i in range(len(responsibilities)):
        for j in range(i + 1, len(responsibilities)):
            similarity = SequenceMatcher(
                None,
                responsibilities[i].lower(),
                responsibilities[j].lower(),
            ).ratio()
            if similarity >= threshold:
                duplicates.append((i, j, similarity))
                logger.warning(
                    "Duplicate responsibilities detected: [%d] vs [%d] (similarity=%.2f): '%s' ~ '%s'",
                    i, j, similarity,
                    responsibilities[i][:50],
                    responsibilities[j][:50],
                )
    return duplicates


def _validate_responsibilities(responsibilities: list[str]) -> list[str]:
    """Validate responsibilities: ≥ 3 items, no duplicates.

    Raises:
        ValueError: If fewer than 3 responsibilities.

    Returns:
        Deduplicated list of responsibilities.
    """
    if len(responsibilities) < 3:
        raise ValueError(
            f"JD must have at least 3 responsibilities, got {len(responsibilities)}"
        )

    # Remove duplicates (keep first occurrence)
    duplicates = _check_duplicate_responsibilities(responsibilities)
    if duplicates:
        indices_to_remove = {j for _, j, _ in duplicates}
        cleaned = [r for i, r in enumerate(responsibilities) if i not in indices_to_remove]
        logger.info(
            "Removed %d duplicate responsibilities, %d remaining",
            len(indices_to_remove),
            len(cleaned),
        )
        # After removal, still need ≥ 3
        if len(cleaned) < 3:
            logger.warning("After dedup only %d responsibilities remain, keeping originals", len(cleaned))
            return responsibilities
        return cleaned

    return responsibilities


def _validate_benchmark_criteria(criteria: list[BenchmarkCriterion]) -> list[BenchmarkCriterion]:
    """Validate benchmark criteria: normalize weights, check standardRequirement.

    Returns:
        Validated and normalized criteria.
    """
    # Normalize weights to sum = 100
    criteria = _normalize_weights(criteria)

    # Ensure every criterion has a non-empty standardRequirement
    for c in criteria:
        if not c.standard_requirement or not c.standard_requirement.strip():
            logger.warning("Criterion '%s' has empty standardRequirement, setting default", c.name)
            c.standard_requirement = f"Đáp ứng yêu cầu về {c.name}"

    return criteria


# ============================================================
# Main generation functions
# ============================================================

async def generate_jd(request: JDGenerateRequest) -> JDGenerateResponse:
    """Generate a complete JD + benchmark criteria from basic input.

    Flow:
    1. Build prompt from input
    2. Call LLM for JD generation (structured output → GeneratedJD)
    3. Validate responsibilities (≥ 3, no duplicates)
    4. Call LLM for benchmark generation (structured output → BenchmarkResult)
    5. Validate benchmark weights (sum = 100)
    6. Return combined response

    Args:
        request: JD generation input (title, level, skills, experience, notes).

    Returns:
        JDGenerateResponse with JD content + benchmark criteria.
    """
    start = time.monotonic()
    manager = get_llm_manager()

    try:
        # --- Step 1: Generate JD ---
        system_prompt, user_prompt = build_jd_generation_prompt(
            title=request.title,
            level=request.level,
            skills=request.skills,
            experience=request.experience,
            notes=request.notes,
        )

        jd_result, jd_usage = await manager.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=GeneratedJD,
        )

        # Validate responsibilities
        jd_result.responsibilities = _validate_responsibilities(jd_result.responsibilities)

        # --- Step 2: Generate Benchmark from the JD ---
        jd_full_text = _build_jd_text(jd_result)
        benchmark_system, benchmark_user = build_benchmark_generation_prompt(jd_full_text)

        benchmark_result, benchmark_usage = await manager.generate_structured(
            system_prompt=benchmark_system,
            user_prompt=benchmark_user,
            response_model=BenchmarkResult,
        )

        # Validate benchmark
        validated_criteria = _validate_benchmark_criteria(benchmark_result.criteria)

        elapsed = int((time.monotonic() - start) * 1000)

        provenance = JDProvenance(
            model_used=jd_usage.model,
            prompt_version=PROMPT_VERSION,
            fallback_used=jd_usage.fallback_used or benchmark_usage.fallback_used,
            input_tokens=jd_usage.input_tokens + benchmark_usage.input_tokens,
            output_tokens=jd_usage.output_tokens + benchmark_usage.output_tokens,
            estimated_cost_usd=jd_usage.estimated_cost_usd + benchmark_usage.estimated_cost_usd,
            processing_time_ms=elapsed,
        )

        logger.info(
            "JD generated: title='%s' responsibilities=%d criteria=%d time=%dms cost=$%.4f",
            request.title,
            len(jd_result.responsibilities),
            len(validated_criteria),
            elapsed,
            provenance.estimated_cost_usd,
        )

        return JDGenerateResponse(
            status="success",
            jd=jd_result,
            benchmark_criteria=validated_criteria,
            provenance=provenance,
        )

    except LLMError as e:
        elapsed = int((time.monotonic() - start) * 1000)
        logger.error("JD generation failed: %s (time=%dms)", e, elapsed)
        return JDGenerateResponse(
            status="error",
            jd=None,
            benchmark_criteria=None,
            provenance=JDProvenance(
                model_used="unknown",
                prompt_version=PROMPT_VERSION,
                processing_time_ms=elapsed,
            ),
            error_message=str(e),
        )

    except ValueError as e:
        elapsed = int((time.monotonic() - start) * 1000)
        logger.error("JD validation failed: %s", e)
        return JDGenerateResponse(
            status="error",
            jd=None,
            benchmark_criteria=None,
            provenance=JDProvenance(
                model_used="unknown",
                prompt_version=PROMPT_VERSION,
                processing_time_ms=elapsed,
            ),
            error_message=str(e),
        )


async def generate_benchmark(request: BenchmarkGenerateRequest) -> BenchmarkGenerateResponse:
    """Generate benchmark criteria from an existing JD text.

    This is for cases where the JD was written manually (not AI-generated)
    and the recruiter wants to generate evaluation criteria.

    Args:
        request: Contains the full JD text.

    Returns:
        BenchmarkGenerateResponse with criteria list.
    """
    start = time.monotonic()
    manager = get_llm_manager()

    try:
        system_prompt, user_prompt = build_benchmark_generation_prompt(
            request.job_description,
        )

        result, usage = await manager.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=BenchmarkResult,
        )

        validated_criteria = _validate_benchmark_criteria(result.criteria)

        elapsed = int((time.monotonic() - start) * 1000)

        provenance = JDProvenance(
            model_used=usage.model,
            prompt_version=PROMPT_VERSION,
            fallback_used=usage.fallback_used,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            estimated_cost_usd=usage.estimated_cost_usd,
            processing_time_ms=elapsed,
        )

        logger.info(
            "Benchmark generated: criteria=%d time=%dms cost=$%.4f",
            len(validated_criteria),
            elapsed,
            provenance.estimated_cost_usd,
        )

        return BenchmarkGenerateResponse(
            status="success",
            criteria=validated_criteria,
            provenance=provenance,
        )

    except LLMError as e:
        elapsed = int((time.monotonic() - start) * 1000)
        logger.error("Benchmark generation failed: %s (time=%dms)", e, elapsed)
        return BenchmarkGenerateResponse(
            status="error",
            criteria=None,
            provenance=JDProvenance(
                model_used="unknown",
                prompt_version=PROMPT_VERSION,
                processing_time_ms=elapsed,
            ),
            error_message=str(e),
        )


# ============================================================
# Helpers
# ============================================================

def _build_jd_text(jd: GeneratedJD) -> str:
    """Combine GeneratedJD parts into a single text for benchmark generation."""
    responsibilities_text = "\n".join(f"- {r}" for r in jd.responsibilities)
    return (
        f"## Tổng quan\n{jd.overview}\n\n"
        f"## Trách nhiệm chính\n{responsibilities_text}\n\n"
        f"## Yêu cầu ứng viên\n{jd.requirements}\n\n"
        f"## Quyền lợi\n{jd.benefits}"
    )
