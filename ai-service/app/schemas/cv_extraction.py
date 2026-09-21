"""
Pydantic schemas for LLM-based CV extraction (Phase 2).

Design principles:
- All fields Optional (except name) — LLM must NOT hallucinate missing data
- source_text on each sub-model — evidence traceability
- Confidence ≠ Completeness — two distinct quality signals
- years_of_experience: claimed (LLM) vs calculated (Python deterministic)
- NO demographic/bias fields: gender, age, religion, marital_status, photo
"""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================

class ConfidenceLevel(str, Enum):
    """How confident the AI is that it READ the information correctly."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class CompletenessLevel(str, Enum):
    """How complete the CV data is (NOT related to extraction quality)."""
    COMPLETE = "COMPLETE"      # All critical fields present
    PARTIAL = "PARTIAL"        # Some critical fields missing
    MINIMAL = "MINIMAL"        # Most fields missing


class LanguageProficiency(str, Enum):
    NATIVE = "NATIVE"
    FLUENT = "FLUENT"
    INTERMEDIATE = "INTERMEDIATE"
    BASIC = "BASIC"


# ============================================================
# CV Sub-models (used by LLM structured output)
# ============================================================

class CandidateInfo(BaseModel):
    """Basic candidate identification and contact info."""
    name: str = Field(..., description="Full name of the candidate")
    email: str | None = Field(None, description="Email address")
    phone: str | None = Field(None, description="Phone number")
    location: str | None = Field(None, description="City/Province or full address")
    linkedin_url: str | None = Field(None, description="LinkedIn profile URL")
    github_url: str | None = Field(None, description="GitHub profile URL")
    portfolio_url: str | None = Field(None, description="Personal website or portfolio URL")
    summary: str | None = Field(
        None,
        description="Professional summary or objective as stated in the CV",
    )
    date_of_birth: str | None = Field(
        None,
        description="Date of birth in YYYY-MM-DD format if explicitly stated in the CV (e.g. '1998-05-20' or '2000-11-15'). If only year is given, format as YYYY-01-01.",
    )
    gender: str | None = Field(
        None,
        description="Gender if explicitly stated in the CV: 'MALE' (Nam), 'FEMALE' (Nữ), or 'OTHER'",
    )


class WorkExperience(BaseModel):
    """A single work experience entry."""
    company: str | None = Field(None, description="Company or organization name")
    title: str | None = Field(None, description="Job title / role")
    start_date: str | None = Field(
        None,
        description="Start date in any format found in CV (e.g. '2020', 'Jan 2020', '01/2020')",
    )
    end_date: str | None = Field(
        None,
        description="End date, or 'Present'/'Hiện tại' if currently working",
    )
    is_current: bool = Field(False, description="True if this is the current/ongoing position")
    description: str | None = Field(None, description="Job description / responsibilities")
    technologies: list[str] = Field(
        default_factory=list,
        description="Technologies and tools used in this role",
    )
    source_text: str | None = Field(
        None,
        description="Original text snippet from CV that this was extracted from",
    )


class Education(BaseModel):
    """A single education entry."""
    institution: str | None = Field(None, description="School / University name")
    degree: str | None = Field(None, description="Degree type (e.g. 'Cử nhân', 'Bachelor', 'Thạc sĩ')")
    field_of_study: str | None = Field(None, description="Major / field of study")
    start_date: str | None = Field(None, description="Start date")
    end_date: str | None = Field(None, description="End date or expected graduation")
    gpa: str | None = Field(None, description="GPA as stated in CV (keep original format)")
    source_text: str | None = Field(
        None,
        description="Original text snippet from CV that this was extracted from",
    )


class Certification(BaseModel):
    """A professional certification or license."""
    name: str | None = Field(None, description="Certification name")
    issuer: str | None = Field(None, description="Issuing organization")
    date_obtained: str | None = Field(None, description="Date obtained")
    expiry_date: str | None = Field(None, description="Expiry date if applicable")
    credential_id: str | None = Field(None, description="Credential ID or URL")


class Project(BaseModel):
    """A project (personal, academic, or professional)."""
    name: str | None = Field(None, description="Project name")
    description: str | None = Field(None, description="Project description")
    technologies: list[str] = Field(
        default_factory=list,
        description="Technologies used",
    )
    url: str | None = Field(None, description="Project URL / demo link")
    role: str | None = Field(None, description="Candidate's role in the project")
    source_text: str | None = Field(
        None,
        description="Original text snippet from CV that this was extracted from",
    )


class LanguageSkill(BaseModel):
    """A language the candidate speaks."""
    language: str = Field(..., description="Language name (e.g. 'English', 'Tiếng Việt')")
    proficiency: LanguageProficiency | None = Field(
        None,
        description="Proficiency level",
    )


# ============================================================
# Confidence / Quality models
# ============================================================

class FieldConfidence(BaseModel):
    """Extraction confidence for a specific field — evidence-based.

    'confidence' = how sure the AI is that it read this correctly.
    'evidence'   = the actual text or value extracted, for verification.

    Example:
        field_name="email", confidence=HIGH, evidence="nguyenvana@gmail.com"
        field_name="skills", confidence=HIGH, evidence=["Java", "Spring Boot"]
        field_name="email", confidence=HIGH, evidence=null   ← "CV has no email" is still HIGH confidence
    """
    field_name: str = Field(..., description="The field being evaluated")
    confidence: ConfidenceLevel = Field(
        ...,
        description=(
            "How confident the AI is in its extraction. "
            "HIGH = clearly stated in CV. "
            "MEDIUM = inferred or partially visible. "
            "LOW = guessed or ambiguous."
        ),
    )
    evidence: str | list[str] | None = Field(
        None,
        description="The actual extracted text/values that justify this confidence",
    )


# ============================================================
# Main ExtractedCV model — LLM output target
# ============================================================

class ExtractedCV(BaseModel):
    """Structured CV data extracted by LLM.

    This is the schema the LLM must conform to via structured outputs.
    All fields are Optional except candidate.name — if data is not
    present in the CV, return null instead of hallucinating.
    """

    candidate: CandidateInfo
    skills: list[str] = Field(
        default_factory=list,
        description="List of technical and soft skills mentioned in the CV",
    )
    work_experience: list[WorkExperience] = Field(
        default_factory=list,
        description="Work experience entries, ordered from most recent to oldest",
    )
    education: list[Education] = Field(
        default_factory=list,
        description="Education entries",
    )
    certifications: list[Certification] = Field(
        default_factory=list,
        description="Professional certifications",
    )
    projects: list[Project] = Field(
        default_factory=list,
        description="Projects (personal, academic, or professional)",
    )
    languages: list[LanguageSkill] = Field(
        default_factory=list,
        description="Languages the candidate speaks",
    )

    # --- Experience: LLM only extracts claimed value ---
    years_of_experience_claimed: float | None = Field(
        None,
        description=(
            "Years of experience as explicitly CLAIMED by the candidate in the CV. "
            "Only fill this if the CV contains a statement like '3+ years of experience'. "
            "Do NOT calculate from work history dates — that will be done separately."
        ),
    )

    # --- Quality signals (populated by LLM) ---
    field_confidences: list[FieldConfidence] = Field(
        default_factory=list,
        description=(
            "Per-field extraction confidence. Must include at minimum: "
            "name, email, phone, skills, work_experience, education"
        ),
    )


# ============================================================
# Post-processing model (Python-calculated, NOT from LLM)
# ============================================================

class CVExtractionResult(BaseModel):
    """Final result after LLM extraction + Python post-processing.

    This is what gets stored in the database and returned to the API.
    Adds Python-calculated fields on top of ExtractedCV.
    """

    extracted_cv: ExtractedCV

    # --- Python-calculated ---
    years_of_experience_calculated: float | None = Field(
        None,
        description="Total years calculated deterministically from work_experience dates",
    )

    # --- Quality assessment (Python-calculated) ---
    overall_confidence: ConfidenceLevel = Field(
        ...,
        description="Weighted average of field confidences",
    )
    completeness: CompletenessLevel = Field(
        ...,
        description="How complete the CV data is (independent of extraction quality)",
    )
    completeness_details: dict[str, bool] = Field(
        default_factory=dict,
        description="Which critical fields are present: {name: true, skills: true, email: false, ...}",
    )


# ============================================================
# API Request / Response
# ============================================================

class CVExtractionRequest(BaseModel):
    """Request to extract structured data from a CV."""

    storage_key: str = Field(
        ...,
        description=(
            "MinIO object key for the CV file. "
            "e.g. 'candidates/123/cv.pdf'. "
            "Backend resolves this to the configured bucket."
        ),
        examples=["candidates/123/cv.pdf"],
    )


class ExtractionProvenance(BaseModel):
    """Metadata about how the extraction was performed."""
    model_used: str = Field(..., description="LLM model that produced the extraction")
    prompt_version: str = Field(..., description="Version of the extraction prompt")
    fallback_used: bool = Field(False, description="Whether fallback model was used")
    input_tokens: int = Field(0, description="Total input tokens consumed")
    output_tokens: int = Field(0, description="Total output tokens consumed")
    estimated_cost_usd: float = Field(0.0, description="Estimated cost in USD")
    processing_time_ms: int = Field(0, description="Total processing time in milliseconds")
    retries: int = Field(0, description="Number of retries needed")


class CVExtractionResponse(BaseModel):
    """Response from the CV extraction endpoint."""

    status: str = Field(
        ...,
        description="Extraction status: success, error, or partial",
    )
    result: CVExtractionResult | None = Field(
        None,
        description="Extraction result (null if status=error)",
    )
    provenance: ExtractionProvenance
    error_code: str | None = Field(None, description="Error code if failed")
    error_message: str | None = Field(None, description="Error message if failed")
