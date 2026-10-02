"""
Pydantic schemas for AI Scoring & Matching (Phase 5).

Design:
- CriterionEvaluation: LLM structured output for a single criterion
- CriterionScore: Full criterion result (input + LLM output merged)
- HardFilterFlag: Rule-based must-have check result
- Scorecard: Complete scoring result for an application
- Blind scoring: No candidate name/email/gender in LLM-facing schemas
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================

class CriterionStatus(str, Enum):
    """Result of evaluating a single criterion."""
    PASS = "PASS"          # Fully meets the requirement
    PARTIAL = "PARTIAL"    # Partially meets the requirement
    FAIL = "FAIL"          # Does not meet the requirement


class ApplicationClassification(str, Enum):
    """Overall application classification based on total score."""
    MATCH = "MATCH"            # totalScore >= 80
    REVIEW = "REVIEW"          # 50 <= totalScore < 80
    NOT_MATCH = "NOT_MATCH"    # totalScore < 50


# ============================================================
# LLM Output Model (structured output target)
# ============================================================

class CriterionEvaluation(BaseModel):
    """LLM output for evaluating a single benchmark criterion.

    This is the Pydantic model passed to `generate_structured()`.
    The LLM must return JSON conforming to this schema.
    """
    score: int = Field(
        ...,
        ge=0,
        le=100,
        description=(
            "Score from 0 to 100 indicating how well the candidate "
            "meets this criterion. 100 = fully meets, 0 = no evidence at all."
        ),
    )
    status: CriterionStatus = Field(
        ...,
        description=(
            "PASS if score >= 70, PARTIAL if 40 <= score < 70, "
            "FAIL if score < 40."
        ),
    )
    evidence: str = Field(
        ...,
        description=(
            "Direct quote from the CV chunks provided. "
            "Must be an EXACT substring from the CV text above. "
            "If no relevant information found, write: "
            "'Không tìm thấy thông tin liên quan trong CV'"
        ),
    )
    gap_analysis: str = Field(
        ...,
        description=(
            "What is missing compared to the requirement. "
            "Be specific. Example: 'CV chỉ có 1 năm Java, yêu cầu 3 năm'. "
            "If fully met, write: 'Đáp ứng đầy đủ yêu cầu'"
        ),
    )
    reasoning: str = Field(
        ...,
        description=(
            "Brief explanation (1-2 sentences) of why this score was given. "
            "Must reference specific information from the CV."
        ),
    )


# ============================================================
# Hard Filter Result (Rule-based, no AI)
# ============================================================

class HardFilterFlag(BaseModel):
    """Result of a must-have rule-based check."""
    criterion_name: str = Field(
        ..., description="Name of the must-have criterion being checked",
    )
    passed: bool = Field(
        ..., description="True if the candidate meets this must-have requirement",
    )
    reason: str = Field(
        ..., description="Explanation of why it passed or failed",
    )


# ============================================================
# Criterion Score (merged input + LLM output)
# ============================================================

class CriterionScore(BaseModel):
    """Complete result for a single criterion: benchmark input + evaluation."""

    # From BenchmarkCriterion (input)
    name: str
    weight: int
    category: str
    is_must_have: bool = Field(alias="isMustHave", default=False)
    standard_requirement: str = Field(alias="standardRequirement")

    # From CriterionEvaluation (LLM output)
    raw_score: int = Field(
        ..., ge=0, le=100,
        description="Raw score 0-100 from LLM evaluation",
    )
    weighted_score: float = Field(
        ...,
        description="raw_score * weight / 100",
    )
    status: CriterionStatus
    evidence: str
    gap_analysis: str = Field(alias="gapAnalysis")
    reasoning: str = ""

    model_config = {"populate_by_name": True}


# ============================================================
# Scorecard (complete scoring result)
# ============================================================

class Scorecard(BaseModel):
    """Complete scoring result for an application.

    This is stored as JSON in application.ai_scorecard and returned
    by the GET /score API endpoint.
    """
    application_id: int = Field(alias="applicationId")
    job_posting_id: int = Field(alias="jobPostingId")

    total_score: float = Field(
        alias="totalScore",
        description="Weighted sum: Σ(raw_score × weight / 100). Range 0-100.",
    )
    classification: ApplicationClassification = Field(
        description="MATCH (≥80) / REVIEW (50-79) / NOT_MATCH (<50)",
    )
    summary: str = Field(
        description="2-3 sentence summary in Vietnamese of the candidate's fit",
    )

    hard_filter_flags: list[HardFilterFlag] = Field(
        alias="hardFilterFlags",
        default_factory=list,
    )
    criteria_scores: list[CriterionScore] = Field(
        alias="criteriaScores",
    )

    scored_at: datetime = Field(alias="scoredAt")
    scoring_model: str = Field(alias="scoringModel")
    prompt_version: str = Field(alias="promptVersion")
    guardrail_warnings: list[str] = Field(
        alias="guardrailWarnings",
        default_factory=list,
    )

    model_config = {"populate_by_name": True}


# ============================================================
# API Request / Response Schemas
# ============================================================

class ScorecardResponse(BaseModel):
    """Response from GET /applications/{id}/score."""
    status: str = Field(
        ...,
        description="processing | completed | failed | pending_benchmark | not_found",
    )
    scorecard: Scorecard | None = None
    current_stage: str | None = Field(
        None, alias="currentStage",
        description="Current pipeline stage if still processing",
    )
    error_message: str | None = Field(
        None, alias="errorMessage",
    )

    model_config = {"populate_by_name": True}


class RescoreRequest(BaseModel):
    """Request to trigger a rescore."""
    reason: str = Field(
        default="Recruiter requested rescore",
        description="Reason for rescoring",
    )


class RescoreResponse(BaseModel):
    """Response from POST /applications/{id}/rescore."""
    message: str
    new_job_id: int = Field(alias="newJobId")

    model_config = {"populate_by_name": True}


class FeedbackRequest(BaseModel):
    """Request to submit recruiter feedback on scoring."""
    application_id: int = Field(alias="applicationId")
    action: str = Field(
        ...,
        description="ACCEPT | OVERRIDE_SCORE | REPORT_ISSUE",
    )
    original_score: float = Field(alias="originalScore")
    corrected_score: float | None = Field(
        None, alias="correctedScore",
        description="New score if action is OVERRIDE_SCORE",
    )
    comment: str | None = None

    model_config = {"populate_by_name": True}
