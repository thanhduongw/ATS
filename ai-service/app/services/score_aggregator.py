"""
Score Aggregator — Phase 5, Task 5.6.

Aggregates individual criterion scores into a total score,
classifies the application (MATCH / REVIEW / NOT_MATCH),
and generates a Vietnamese summary via LLM.

Formula:
    total_score = Σ (criterion.raw_score × criterion.weight / 100)

Classification:
    total_score >= 80  → MATCH 🟢
    50 <= score < 80   → REVIEW 🟡
    score < 50         → NOT_MATCH 🔴
"""

from __future__ import annotations

import logging

from app.core.llm_client import LLMError, get_llm_manager
from app.schemas.scoring import (
    ApplicationClassification,
    CriterionScore,
    HardFilterFlag,
)
from app.services.prompts.scoring import build_summary_prompt

logger = logging.getLogger(__name__)


def classify_score(total_score: float) -> ApplicationClassification:
    """Classify total score into MATCH / REVIEW / NOT_MATCH.

    Thresholds:
        >= 80 → MATCH
        >= 50 → REVIEW
        <  50 → NOT_MATCH
    """
    if total_score >= 80:
        return ApplicationClassification.MATCH
    elif total_score >= 50:
        return ApplicationClassification.REVIEW
    else:
        return ApplicationClassification.NOT_MATCH


def compute_total_score(criteria_scores: list[CriterionScore]) -> float:
    """Compute weighted total score from individual criterion scores.

    Formula: Σ (raw_score × weight / 100)
    Each criterion's weighted_score is already precomputed, so we just sum.
    The result is clamped to [0, 100].
    """
    total = sum(cs.weighted_score for cs in criteria_scores)
    return round(max(0.0, min(100.0, total)), 2)


async def generate_summary(
    criteria_scores: list[CriterionScore],
    classification: ApplicationClassification,
    total_score: float,
) -> str:
    """Generate a 2-3 sentence Vietnamese summary of the scoring result.

    Uses LLM (lightweight call, no structured output needed).
    Falls back to a template-based summary if LLM fails.

    Args:
        criteria_scores: All criterion results.
        classification: Overall classification.
        total_score: Weighted total score.

    Returns:
        Summary string in Vietnamese.
    """
    # Build criteria data for the prompt
    criteria_data = [
        {
            "name": cs.name,
            "status": cs.status.value,
            "gap_analysis": cs.gap_analysis,
        }
        for cs in criteria_scores
    ]

    system_prompt, user_prompt = build_summary_prompt(
        criteria_results=criteria_data,
        classification=classification.value,
        total_score=total_score,
    )

    try:
        from pydantic import BaseModel, Field

        class SummaryOutput(BaseModel):
            """Simple LLM output for summary generation."""
            summary: str = Field(
                ...,
                description="Tóm tắt 2-3 câu bằng tiếng Việt về mức độ phù hợp của ứng viên",
            )

        manager = get_llm_manager()
        result, _usage = await manager.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=SummaryOutput,
        )
        return result.summary

    except (LLMError, Exception) as e:
        logger.warning("Failed to generate LLM summary, using template: %s", e)
        return _build_fallback_summary(
            criteria_scores, classification, total_score,
        )


def _build_fallback_summary(
    criteria_scores: list[CriterionScore],
    classification: ApplicationClassification,
    total_score: float,
) -> str:
    """Template-based fallback summary when LLM is unavailable."""
    classification_vn = {
        ApplicationClassification.MATCH: "PHÙ HỢP",
        ApplicationClassification.REVIEW: "CẦN XEM XÉT",
        ApplicationClassification.NOT_MATCH: "KHÔNG PHÙ HỢP",
    }

    passed = [cs for cs in criteria_scores if cs.status.value == "PASS"]
    failed = [cs for cs in criteria_scores if cs.status.value == "FAIL"]

    label = classification_vn.get(classification, "CẦN XEM XÉT")

    summary = f"Ứng viên được đánh giá {label} với tổng điểm {total_score:.1f}/100."

    if passed:
        names = ", ".join(cs.name for cs in passed[:3])
        summary += f" Đáp ứng tốt: {names}."

    if failed:
        names = ", ".join(cs.name for cs in failed[:3])
        summary += f" Chưa đạt: {names}."

    return summary


async def aggregate_scores(
    criteria_scores: list[CriterionScore],
    hard_filter_flags: list[HardFilterFlag],
) -> tuple[float, ApplicationClassification, str]:
    """Aggregate criterion scores into final result.

    Args:
        criteria_scores: Scored criteria from scoring_engine.
        hard_filter_flags: Rule-based must-have check results.

    Returns:
        Tuple of (total_score, classification, summary_text).
    """
    # 1. Compute total weighted score
    total_score = compute_total_score(criteria_scores)

    # 2. Classify
    classification = classify_score(total_score)

    # 3. Generate summary
    summary = await generate_summary(
        criteria_scores, classification, total_score,
    )

    logger.info(
        "Score aggregation: total=%.2f, classification=%s, "
        "%d criteria, %d hard filters (%d failed)",
        total_score,
        classification.value,
        len(criteria_scores),
        len(hard_filter_flags),
        sum(1 for f in hard_filter_flags if not f.passed),
    )

    return total_score, classification, summary
