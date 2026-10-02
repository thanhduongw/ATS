"""
Hard Filter Engine — Phase 5, Task 5.1.

Rule-based checks for must-have criteria. Does NOT use AI.
Flags candidates who don't meet mandatory requirements, but
does NOT automatically reject them — final decision is for HR.
"""

from __future__ import annotations

import logging
import re

from app.schemas.cv_extraction import ExtractedCV
from app.schemas.jd_generation import BenchmarkCriterion
from app.schemas.scoring import HardFilterFlag

logger = logging.getLogger(__name__)


def _extract_years_from_requirement(text: str) -> int | None:
    """Extract minimum years required from a requirement string.

    Examples:
        "3+ năm kinh nghiệm Java" → 3
        "Tối thiểu 2 năm" → 2
        "At least 5 years" → 5
    """
    patterns = [
        r"(\d+)\+?\s*(?:năm|year)",
        r"(?:tối thiểu|ít nhất|at least|minimum)\s*(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


def _extract_keywords_from_requirement(text: str) -> list[str]:
    """Extract technology/skill keywords from requirement text.

    Simple heuristic: words that look like tech names (capitalized,
    contain dots, or are common frameworks).
    """
    # Remove common Vietnamese/English filler words
    filler = {
        "kinh", "nghiệm", "năm", "year", "years", "tối", "thiểu",
        "ít", "nhất", "làm", "việc", "với", "sử", "dụng", "có",
        "biết", "thành", "thạo", "and", "or", "the", "with", "in",
        "at", "least", "minimum", "experience", "knowledge", "of",
        "working", "proficiency", "strong", "good", "excellent",
    }

    # Split on common delimiters
    tokens = re.split(r"[,;/\s]+", text)
    keywords = []
    for token in tokens:
        clean = token.strip("()[]{}\"'.,;:+-")
        if len(clean) < 2:
            continue
        if clean.lower() in filler:
            continue
        # Keep if it looks like a tech keyword
        if (
            clean[0].isupper()  # Capitalized
            or "." in clean     # e.g., Node.js
            or clean.isupper()  # ALL CAPS e.g., AWS, SQL
            or any(c.isdigit() for c in clean)  # Contains numbers
        ):
            keywords.append(clean)

    return keywords


def _check_skills_match(
    cv_skills: list[str],
    required_keywords: list[str],
) -> tuple[bool, list[str]]:
    """Check if CV skills contain the required keywords.

    Returns (passed, missing_keywords).
    Uses case-insensitive substring matching.
    """
    cv_skills_lower = [s.lower() for s in cv_skills]
    missing = []

    for keyword in required_keywords:
        kw_lower = keyword.lower()
        found = any(
            kw_lower in skill or skill in kw_lower
            for skill in cv_skills_lower
        )
        if not found:
            missing.append(keyword)

    return len(missing) == 0, missing


def _check_education(
    cv: ExtractedCV,
    requirement: str,
) -> tuple[bool, str]:
    """Check if candidate meets education requirements.

    Simple check: does the candidate have any education entries?
    More advanced: check degree level keywords.
    """
    if not cv.education:
        return False, "CV không có thông tin học vấn"

    # Check for degree level keywords in requirement
    req_lower = requirement.lower()
    degree_levels = {
        "thạc sĩ": ["thạc sĩ", "master", "msc", "mba"],
        "tiến sĩ": ["tiến sĩ", "doctor", "phd"],
        "đại học": ["đại học", "cử nhân", "bachelor", "university", "bsc", "bba"],
    }

    for level_name, keywords in degree_levels.items():
        if any(kw in req_lower for kw in keywords):
            # Check if candidate has this level
            for edu in cv.education:
                edu_text = " ".join(filter(None, [
                    edu.degree, edu.field_of_study, edu.institution,
                ])).lower()
                if any(kw in edu_text for kw in keywords):
                    return True, f"Có bằng {level_name}"
            return False, f"Yêu cầu {level_name} nhưng không tìm thấy trong CV"

    # No specific level required — any education is fine
    return True, "Có thông tin học vấn"


def _check_certifications(
    cv: ExtractedCV,
    requirement: str,
) -> tuple[bool, str]:
    """Check if candidate has required certifications."""
    if not cv.certifications:
        return False, "CV không có chứng chỉ nào"

    cert_names = [c.name.lower() for c in cv.certifications if c.name]
    keywords = _extract_keywords_from_requirement(requirement)

    for kw in keywords:
        kw_lower = kw.lower()
        found = any(kw_lower in name for name in cert_names)
        if found:
            return True, f"Có chứng chỉ liên quan: {kw}"

    return False, f"Không tìm thấy chứng chỉ yêu cầu"


def run_hard_filters(
    extracted_cv: ExtractedCV,
    criteria: list[BenchmarkCriterion],
) -> list[HardFilterFlag]:
    """Run rule-based hard filters on must-have criteria.

    Only checks criteria where is_must_have is True.
    Does NOT reject candidates — just flags issues for HR.

    Args:
        extracted_cv: Structured CV data from Phase 2.
        criteria: Benchmark criteria from JD (Phase 3).

    Returns:
        List of HardFilterFlag for each must-have criterion.
    """
    flags: list[HardFilterFlag] = []

    for criterion in criteria:
        if not criterion.is_must_have:
            continue

        category = criterion.category.value
        requirement = criterion.standard_requirement
        name = criterion.name

        if category in ("TECHNICAL", "EXPERIENCE"):
            # Check skill keywords
            keywords = _extract_keywords_from_requirement(requirement)
            if keywords and extracted_cv.skills:
                passed, missing = _check_skills_match(
                    extracted_cv.skills, keywords,
                )
                if passed:
                    reason = f"Có kỹ năng yêu cầu: {', '.join(keywords)}"
                else:
                    reason = f"Thiếu kỹ năng: {', '.join(missing)}"
                flags.append(HardFilterFlag(
                    criterion_name=name, passed=passed, reason=reason,
                ))
            elif not extracted_cv.skills:
                flags.append(HardFilterFlag(
                    criterion_name=name,
                    passed=False,
                    reason="CV không liệt kê kỹ năng nào",
                ))
            else:
                # No keywords extracted from requirement — skip
                flags.append(HardFilterFlag(
                    criterion_name=name,
                    passed=True,
                    reason="Không thể kiểm tra tự động — cần AI đánh giá",
                ))

        elif category == "EDUCATION":
            passed, reason = _check_education(extracted_cv, requirement)
            flags.append(HardFilterFlag(
                criterion_name=name, passed=passed, reason=reason,
            ))

        elif category == "CERTIFICATION":
            passed, reason = _check_certifications(extracted_cv, requirement)
            flags.append(HardFilterFlag(
                criterion_name=name, passed=passed, reason=reason,
            ))

        elif category == "LANGUAGE":
            # Check languages
            if not extracted_cv.languages:
                flags.append(HardFilterFlag(
                    criterion_name=name,
                    passed=False,
                    reason="CV không liệt kê ngoại ngữ nào",
                ))
            else:
                lang_names = [
                    l.language.lower() for l in extracted_cv.languages
                ]
                keywords = _extract_keywords_from_requirement(requirement)
                found = any(
                    kw.lower() in " ".join(lang_names) for kw in keywords
                ) if keywords else True
                flags.append(HardFilterFlag(
                    criterion_name=name,
                    passed=found,
                    reason=(
                        f"Có ngoại ngữ: {', '.join(lang_names)}"
                        if found
                        else f"Thiếu ngoại ngữ yêu cầu"
                    ),
                ))

        else:
            # OTHER, SOFT_SKILL — can't rule-check, skip
            flags.append(HardFilterFlag(
                criterion_name=name,
                passed=True,
                reason="Tiêu chí kỹ năng mềm — cần AI đánh giá chi tiết",
            ))

    logger.info(
        "Hard filter: %d must-have criteria checked, %d passed, %d failed",
        len(flags),
        sum(1 for f in flags if f.passed),
        sum(1 for f in flags if not f.passed),
    )

    return flags
