"""
CV Extraction Engine — Phase 2 core.

Full pipeline:
    1. Extract raw text (Phase 1)
    2. Build LLM prompt
    3. Call LLM via LLMManager (structured output)
    4. Pydantic validation (enforced by LLM provider + post-check)
    5. Calculate years_of_experience from dates (deterministic Python)
    6. Compute overall confidence + completeness
    7. Return CVExtractionResult
"""

from __future__ import annotations

import logging
import time

from app.core.config import get_settings
from app.core.llm_client import LLMError, LLMManager, LLMUsage, get_llm_manager
from app.schemas.cv_extraction import (
    CVExtractionResponse,
    CVExtractionResult,
    CompletenessLevel,
    ConfidenceLevel,
    ExtractionProvenance,
    ExtractedCV,
)
from app.services.experience import calculate_years_of_experience, parse_date, today_in
from app.services.prompts.cv_extraction import PROMPT_VERSION, build_extraction_prompt

logger = logging.getLogger(__name__)


# ============================================================
# Years of Experience — xem app/services/experience.py (Python thuần, dùng chung với chấm điểm)
# ============================================================

_parse_date = parse_date  # tên cũ, giữ cho test / code đang dùng


# ============================================================
# Confidence & Completeness Calculator
# ============================================================

# Weights for overall confidence calculation
_CONFIDENCE_WEIGHTS = {
    "name": 3,
    "skills": 3,
    "work_experience": 3,
    "education": 2,
    "email": 1,
    "phone": 1,
}

_CONFIDENCE_VALUES = {
    ConfidenceLevel.HIGH: 1.0,
    ConfidenceLevel.MEDIUM: 0.6,
    ConfidenceLevel.LOW: 0.2,
}

# Critical fields for completeness assessment
_CRITICAL_FIELDS = ["name", "skills", "work_experience"]
_IMPORTANT_FIELDS = ["education", "email"]


def compute_overall_confidence(cv: ExtractedCV) -> ConfidenceLevel:
    """Compute weighted average of field confidences.

    Returns HIGH (≥0.7), MEDIUM (0.4-0.7), LOW (<0.4).
    """
    if not cv.field_confidences:
        return ConfidenceLevel.LOW

    # Build a lookup
    conf_map = {fc.field_name: fc.confidence for fc in cv.field_confidences}

    weighted_sum = 0.0
    total_weight = 0.0

    for field, weight in _CONFIDENCE_WEIGHTS.items():
        if field in conf_map:
            weighted_sum += _CONFIDENCE_VALUES[conf_map[field]] * weight
            total_weight += weight

    if total_weight == 0:
        return ConfidenceLevel.LOW

    score = weighted_sum / total_weight

    if score >= 0.7:
        return ConfidenceLevel.HIGH
    elif score >= 0.4:
        return ConfidenceLevel.MEDIUM
    else:
        return ConfidenceLevel.LOW


def compute_completeness(cv: ExtractedCV) -> tuple[CompletenessLevel, dict[str, bool]]:
    """Assess CV completeness — independent of extraction quality.

    Returns (level, details_dict).
    """
    details = {
        "name": bool(cv.candidate.name),
        "email": bool(cv.candidate.email),
        "phone": bool(cv.candidate.phone),
        "skills": len(cv.skills) > 0,
        "work_experience": len(cv.work_experience) > 0,
        "education": len(cv.education) > 0,
        "summary": bool(cv.candidate.summary),
        "certifications": len(cv.certifications) > 0,
        "projects": len(cv.projects) > 0,
    }

    critical_present = sum(details.get(f, False) for f in _CRITICAL_FIELDS)
    important_present = sum(details.get(f, False) for f in _IMPORTANT_FIELDS)

    if critical_present == len(_CRITICAL_FIELDS) and important_present >= 1:
        return CompletenessLevel.COMPLETE, details
    elif critical_present >= 2:
        return CompletenessLevel.PARTIAL, details
    else:
        return CompletenessLevel.MINIMAL, details


# ============================================================
# Main Extraction Pipeline
# ============================================================

async def extract_cv_from_text(
    cv_text: str,
    manager: LLMManager | None = None,
) -> tuple[CVExtractionResult, LLMUsage]:
    """Extract structured CV data from raw text using LLM.

    This is the core Phase 2 function.

    Args:
        cv_text: Normalized text from Phase 1 extraction.

    Returns:
        Tuple of (CVExtractionResult, LLMUsage).

    Raises:
        LLMError: If LLM extraction fails after all retries.
    """
    # 1. Build prompt (một tin nhắn — giống benchmark trên Kaggle)
    prompt = build_extraction_prompt(cv_text)

    # 2. Call LLM with structured output
    manager = manager or get_llm_manager()
    extracted_cv, usage = await manager.generate_structured(prompt, ExtractedCV)

    # 3. Calculate years of experience (deterministic Python, tính đến ngày trích xuất)
    years_calculated = calculate_years_of_experience(
        extracted_cv.work_experience, today_in(get_settings().app_timezone))

    # 4. Compute quality signals
    overall_confidence = compute_overall_confidence(extracted_cv)
    completeness, completeness_details = compute_completeness(extracted_cv)

    # 5. Build result
    result = CVExtractionResult(
        extracted_cv=extracted_cv,
        years_of_experience_calculated=years_calculated,
        overall_confidence=overall_confidence,
        completeness=completeness,
        completeness_details=completeness_details,
    )

    logger.info(
        "CV extraction complete: name=%s skills=%d experience=%d "
        "years_claimed=%s years_calculated=%s confidence=%s completeness=%s "
        "model=%s tokens=%d+%d cost=$%.4f latency=%dms",
        extracted_cv.candidate.name,
        len(extracted_cv.skills),
        len(extracted_cv.work_experience),
        extracted_cv.years_of_experience_claimed,
        years_calculated,
        overall_confidence.value,
        completeness.value,
        usage.model,
        usage.input_tokens,
        usage.output_tokens,
        usage.estimated_cost_usd,
        usage.latency_ms,
    )

    return result, usage


async def extract_cv_from_file_bytes(
    file_bytes: bytes,
    filename: str | None = None,
) -> CVExtractionResponse:
    """Full pipeline: file bytes → Phase 1 text extraction → Phase 2 LLM extraction.

    Args:
        file_bytes: Raw file content (PDF, DOCX, or image).
        filename: Optional filename for logging.

    Returns:
        CVExtractionResponse with full result or error.
    """
    start = time.monotonic()

    # --- Phase 1: Text extraction ---
    from app.services.extraction_pipeline import extract_text_from_bytes

    text_result = await extract_text_from_bytes(file_bytes, filename)

    if text_result.status != "success" or not text_result.text:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return CVExtractionResponse(
            status="error",
            result=None,
            provenance=ExtractionProvenance(
                model_used="none",
                prompt_version=PROMPT_VERSION,
                processing_time_ms=elapsed_ms,
            ),
            error_code=text_result.metadata.error_code or "TEXT_EXTRACTION_FAILED",
            error_message=text_result.metadata.error_message or "Could not extract text from file",
        )

    # --- Phase 2: LLM extraction ---
    try:
        result, usage = await extract_cv_from_text(text_result.text)

        elapsed_ms = int((time.monotonic() - start) * 1000)
        return CVExtractionResponse(
            status="success",
            result=result,
            provenance=ExtractionProvenance(
                model_used=usage.model,
                prompt_version=PROMPT_VERSION,
                fallback_used=usage.fallback_used,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                estimated_cost_usd=usage.estimated_cost_usd,
                processing_time_ms=elapsed_ms,
                retries=usage.retries,
            ),
        )

    except LLMError as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.error("CV extraction failed: %s", e)
        return CVExtractionResponse(
            status="error",
            result=None,
            provenance=ExtractionProvenance(
                model_used="none",
                prompt_version=PROMPT_VERSION,
                processing_time_ms=elapsed_ms,
                retries=e.retries,
            ),
            error_code="FAILED_EXTRACTION",
            error_message=str(e),
        )
