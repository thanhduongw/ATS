"""
Semantic Chunking Service — Phase 4, Task 4.1.

Splits an ExtractedCV into semantically meaningful chunks for embedding.
Each chunk represents a single coherent unit (one job, one project, etc.)
and is formatted as natural text for optimal embedding quality.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.schemas.cv_extraction import (
    Certification,
    Education,
    ExtractedCV,
    Project,
    WorkExperience,
)

logger = logging.getLogger(__name__)


# ============================================================
# CVChunk dataclass
# ============================================================

@dataclass
class CVChunk:
    """A single semantic chunk derived from a CV."""

    chunk_type: str
    # WORK_EXPERIENCE | PROJECT | EDUCATION | SKILL_SUMMARY
    # | CERTIFICATION | PROFILE_SUMMARY

    content: str  # Human-readable text (NOT raw JSON)
    metadata: dict = field(default_factory=dict)
    embedding: list[float] | None = None  # Populated by EmbeddingService


# ============================================================
# Content formatters
# ============================================================

def _format_work_experience(exp: WorkExperience, order: int) -> str:
    """Format a single work experience entry as natural text."""
    parts: list[str] = []

    title = exp.title or "Vị trí không xác định"
    company = exp.company or "Công ty không xác định"
    parts.append(f"{title} tại {company}")

    date_range = ""
    if exp.start_date:
        date_range = exp.start_date
        if exp.end_date:
            date_range += f" – {exp.end_date}"
        elif exp.is_current:
            date_range += " – Hiện tại"
    if date_range:
        parts[0] += f" ({date_range})"

    if exp.description:
        parts.append(exp.description)

    if exp.technologies:
        parts.append(f"Công nghệ sử dụng: {', '.join(exp.technologies)}")

    return ". ".join(parts)


def _format_education(edu: Education, order: int) -> str:
    """Format a single education entry as natural text."""
    parts: list[str] = []

    degree = edu.degree or ""
    field_of_study = edu.field_of_study or ""
    institution = edu.institution or "Trường không xác định"

    header = " ".join(filter(None, [degree, field_of_study]))
    if header:
        header += f" tại {institution}"
    else:
        header = institution

    date_range = ""
    if edu.start_date:
        date_range = edu.start_date
        if edu.end_date:
            date_range += f" – {edu.end_date}"
    if date_range:
        header += f" ({date_range})"

    parts.append(header)

    if edu.gpa:
        parts.append(f"GPA: {edu.gpa}")

    return ". ".join(parts)


def _format_project(proj: Project, order: int) -> str:
    """Format a single project entry as natural text."""
    parts: list[str] = []

    name = proj.name or "Dự án không xác định"
    parts.append(name)

    if proj.description:
        parts.append(proj.description)

    if proj.technologies:
        parts.append(f"Công nghệ: {', '.join(proj.technologies)}")

    if proj.role:
        parts.append(f"Vai trò: {proj.role}")

    return ". ".join(parts)


def _format_certification(cert: Certification) -> str:
    """Format a single certification as natural text."""
    parts: list[str] = []

    name = cert.name or "Chứng chỉ không xác định"
    parts.append(name)

    if cert.issuer:
        parts.append(f"Cấp bởi: {cert.issuer}")

    if cert.date_obtained:
        parts.append(f"Ngày cấp: {cert.date_obtained}")

    return ". ".join(parts)


# ============================================================
# Main chunking function
# ============================================================

def chunk_extracted_cv(extracted_cv: ExtractedCV) -> list[CVChunk]:
    """Split an ExtractedCV into semantic chunks.

    Chunking strategy:
    - 1 chunk per work experience entry
    - 1 chunk per project entry
    - 1 chunk per education entry
    - 1 consolidated SKILL_SUMMARY chunk
    - 1 consolidated CERTIFICATION chunk (if any)
    - 1 PROFILE_SUMMARY chunk (if candidate.summary exists)

    Returns:
        List of CVChunk objects (without embeddings — those are added later).
    """
    chunks: list[CVChunk] = []

    # --- Profile Summary ---
    if extracted_cv.candidate and extracted_cv.candidate.summary:
        chunks.append(CVChunk(
            chunk_type="PROFILE_SUMMARY",
            content=extracted_cv.candidate.summary,
            metadata={"name": extracted_cv.candidate.name},
        ))

    # --- Work Experience (1 chunk per entry) ---
    for i, exp in enumerate(extracted_cv.work_experience):
        content = _format_work_experience(exp, i)
        if content.strip():
            chunks.append(CVChunk(
                chunk_type="WORK_EXPERIENCE",
                content=content,
                metadata={
                    "order": i,
                    "company": exp.company,
                    "title": exp.title,
                    "is_current": exp.is_current,
                },
            ))

    # --- Education (1 chunk per entry) ---
    for i, edu in enumerate(extracted_cv.education):
        content = _format_education(edu, i)
        if content.strip():
            chunks.append(CVChunk(
                chunk_type="EDUCATION",
                content=content,
                metadata={
                    "order": i,
                    "institution": edu.institution,
                    "degree": edu.degree,
                    "field_of_study": edu.field_of_study,
                },
            ))

    # --- Projects (1 chunk per entry) ---
    for i, proj in enumerate(extracted_cv.projects):
        content = _format_project(proj, i)
        if content.strip():
            chunks.append(CVChunk(
                chunk_type="PROJECT",
                content=content,
                metadata={
                    "order": i,
                    "name": proj.name,
                },
            ))

    # --- Skill Summary (1 consolidated chunk) ---
    skill_parts: list[str] = []
    if extracted_cv.skills:
        skill_parts.append(f"Kỹ năng: {', '.join(extracted_cv.skills)}")
    if extracted_cv.languages:
        lang_strs = [
            f"{l.language} ({l.proficiency.value})" if l.proficiency else l.language
            for l in extracted_cv.languages
        ]
        skill_parts.append(f"Ngôn ngữ: {', '.join(lang_strs)}")

    if skill_parts:
        chunks.append(CVChunk(
            chunk_type="SKILL_SUMMARY",
            content=". ".join(skill_parts),
            metadata={"skill_count": len(extracted_cv.skills)},
        ))
    else:
        # Always create a SKILL_SUMMARY chunk even if empty — Phase 5 needs it
        chunks.append(CVChunk(
            chunk_type="SKILL_SUMMARY",
            content="Không có kỹ năng được liệt kê trong CV",
            metadata={"skill_count": 0},
        ))

    # --- Certifications (1 consolidated chunk) ---
    if extracted_cv.certifications:
        cert_texts = [
            _format_certification(cert)
            for cert in extracted_cv.certifications
        ]
        chunks.append(CVChunk(
            chunk_type="CERTIFICATION",
            content=". ".join(cert_texts),
            metadata={"cert_count": len(extracted_cv.certifications)},
        ))

    logger.info(
        "Chunked CV into %d chunks: %s",
        len(chunks),
        {c.chunk_type for c in chunks},
    )
    return chunks
