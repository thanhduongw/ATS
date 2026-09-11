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
import re
import time
from datetime import date, datetime

from app.core.llm_client import LLMError, LLMUsage, get_llm_manager
from app.schemas.cv_extraction import (
    CVExtractionResponse,
    CVExtractionResult,
    CompletenessLevel,
    ConfidenceLevel,
    ExtractionProvenance,
    ExtractedCV,
    WorkExperience,
)
from app.services.prompts.cv_extraction import PROMPT_VERSION, build_extraction_prompt

logger = logging.getLogger(__name__)


# ============================================================
# Years of Experience Calculator (Deterministic Python)
# ============================================================

# Patterns to parse date strings from LLM output
_MONTH_MAP_EN = {
    "jan": 1, "january": 1, "feb": 2, "february": 2,
    "mar": 3, "march": 3, "apr": 4, "april": 4,
    "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8,
    "sep": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12,
}

_MONTH_MAP_VI = {
    "tháng 1": 1, "tháng 2": 2, "tháng 3": 3,
    "tháng 4": 4, "tháng 5": 5, "tháng 6": 6,
    "tháng 7": 7, "tháng 8": 8, "tháng 9": 9,
    "tháng 10": 10, "tháng 11": 11, "tháng 12": 12,
    "thg 1": 1, "thg 2": 2, "thg 3": 3,
    "thg 4": 4, "thg 5": 5, "thg 6": 6,
    "thg 7": 7, "thg 8": 8, "thg 9": 9,
    "thg 10": 10, "thg 11": 11, "thg 12": 12,
}


def _parse_date(date_str: str | None) -> date | None:
    """Parse a flexible date string into a Python date.

    Supports formats:
        "2020"          → 2020-01-01
        "01/2020"       → 2020-01-01
        "Jan 2020"      → 2020-01-01
        "January 2020"  → 2020-01-01
        "2020-01"       → 2020-01-01
        "Tháng 1/2020"  → 2020-01-01
        "Present"/"Hiện tại"/"Now" → today

    Returns None if unparseable.
    """
    if not date_str:
        return None

    text = date_str.strip().lower()

    # "Present" / "Hiện tại" / "Now" / "Current"
    if text in ("present", "hiện tại", "now", "current", "nay"):
        return date.today()

    # Try ISO-like: "2020-01" or "2020-01-15"
    if re.match(r"^\d{4}-\d{2}(-\d{2})?$", text):
        parts = text.split("-")
        return date(int(parts[0]), int(parts[1]), 1)

    # Try "MM/YYYY" or "M/YYYY"
    match = re.match(r"^(\d{1,2})/(\d{4})$", text)
    if match:
        return date(int(match.group(2)), int(match.group(1)), 1)

    # Try "YYYY" (year only)
    if re.match(r"^\d{4}$", text):
        return date(int(text), 1, 1)

    # Try Vietnamese: "Tháng X/YYYY" or "Tháng X YYYY"
    # Sort by longest key first to avoid prefix collision (e.g. "tháng 1" vs "tháng 12")
    for vi_month, num in sorted(_MONTH_MAP_VI.items(), key=lambda x: len(x[0]), reverse=True):
        if text.startswith(vi_month):
            rest = text[len(vi_month):].strip().strip("/").strip()
            year_match = re.search(r"\d{4}", rest)
            if year_match:
                return date(int(year_match.group()), num, 1)

    # Try English: "Jan 2020", "January 2020"
    # Sort by longest key first to avoid prefix collision (e.g. "sep" vs "september")
    for en_month, num in sorted(_MONTH_MAP_EN.items(), key=lambda x: len(x[0]), reverse=True):
        if text.startswith(en_month):
            rest = text[len(en_month):].strip().strip(",").strip()
            year_match = re.search(r"\d{4}", rest)
            if year_match:
                return date(int(year_match.group()), num, 1)

    logger.debug("Could not parse date: '%s'", date_str)
    return None


def calculate_years_of_experience(
    work_experience: list[WorkExperience],
) -> float | None:
    """Calculate total years of experience from work history dates.

    Uses non-overlapping date ranges to avoid double-counting.
    Returns None if no valid date ranges can be parsed.
    """
    if not work_experience:
        return None

    ranges: list[tuple[date, date]] = []

    for exp in work_experience:
        start = _parse_date(exp.start_date)
        end = _parse_date(exp.end_date)

        # If is_current and no end date, use today
        if exp.is_current and end is None:
            end = date.today()

        if start is None:
            continue
        if end is None:
            # If only start date, skip — we can't calculate duration
            continue
        if start > end:
            # Swap if reversed
            start, end = end, start

        ranges.append((start, end))

    if not ranges:
        return None

    # Merge overlapping ranges
    ranges.sort(key=lambda r: r[0])
    merged: list[tuple[date, date]] = [ranges[0]]

    for start, end in ranges[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end:
            # Overlapping — extend
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))

    # Sum total days
    total_days = sum((end - start).days for start, end in merged)
    years = round(total_days / 365.25, 1)

    return years


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
    # 1. Build prompt
    system_prompt, user_prompt = build_extraction_prompt(cv_text)

    # 2. Call LLM with structured output
    manager = get_llm_manager()
    extracted_cv, usage = await manager.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=ExtractedCV,
    )

    # 3. Calculate years of experience (deterministic Python)
    years_calculated = calculate_years_of_experience(extracted_cv.work_experience)

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


async def extract_cv_from_storage_key(storage_key: str) -> CVExtractionResponse:
    """Full pipeline: MinIO storage key → download → text extraction → LLM extraction.

    Args:
        storage_key: MinIO object key (e.g., 'candidates/123/cv.pdf').
                     Backend resolves this to the configured bucket.

    Returns:
        CVExtractionResponse with full result or error.
    """
    import asyncio
    from functools import partial

    start = time.monotonic()

    # --- Download from MinIO ---
    try:
        from app.core.s3_client import get_s3_client
        from app.core.config import get_settings

        s3 = get_s3_client()
        settings = get_settings()
        bucket = settings.s3_bucket

        loop = asyncio.get_event_loop()
        file_bytes = await loop.run_in_executor(
            None, partial(s3.download_file_bytes, bucket, storage_key)
        )
    except FileNotFoundError:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return CVExtractionResponse(
            status="error",
            result=None,
            provenance=ExtractionProvenance(
                model_used="none",
                prompt_version=PROMPT_VERSION,
                processing_time_ms=elapsed_ms,
            ),
            error_code="FILE_NOT_FOUND",
            error_message=f"File not found: {storage_key}",
        )
    except Exception as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.error("Failed to download file %s: %s", storage_key, e)
        return CVExtractionResponse(
            status="error",
            result=None,
            provenance=ExtractionProvenance(
                model_used="none",
                prompt_version=PROMPT_VERSION,
                processing_time_ms=elapsed_ms,
            ),
            error_code="DOWNLOAD_ERROR",
            error_message=f"Failed to download file: {e}",
        )

    # Determine filename from key
    filename = storage_key.split("/")[-1] if "/" in storage_key else storage_key
    return await extract_cv_from_file_bytes(file_bytes, filename)
