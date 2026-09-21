"""
Pydantic schemas for AI-powered JD Generation & Benchmark Criteria (Phase 3).

Design:
- JD output has 4 parts: overview, responsibilities, requirements, benefits
- Benchmark criteria: 4-5 items with weights summing to 100%
- Each criterion has: name, weight, standardRequirement, category, isMustHave
"""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================

class BenchmarkCategory(str, Enum):
    """Category of a benchmark criterion."""
    TECHNICAL = "TECHNICAL"
    SOFT_SKILL = "SOFT_SKILL"
    EDUCATION = "EDUCATION"
    EXPERIENCE = "EXPERIENCE"
    CERTIFICATION = "CERTIFICATION"
    LANGUAGE = "LANGUAGE"
    OTHER = "OTHER"


# ============================================================
# LLM Output Models (used as response_model for structured output)
# ============================================================

class GeneratedJD(BaseModel):
    """Structured JD output from LLM.

    4 sections as required by master plan:
    - overview: tổng quan vị trí
    - responsibilities: danh sách trách nhiệm (≥ 3 mục)
    - requirements: yêu cầu ứng viên
    - benefits: quyền lợi
    """
    overview: str = Field(
        ...,
        description=(
            "Tổng quan ngắn gọn về vị trí tuyển dụng (2-3 câu). "
            "Giới thiệu vai trò, phòng ban, và mục tiêu chính của vị trí."
        ),
    )
    responsibilities: list[str] = Field(
        ...,
        min_length=3,
        description=(
            "Danh sách trách nhiệm chính của vị trí. "
            "Mỗi mục là một câu mô tả cụ thể. Tối thiểu 3 mục, khuyến nghị 5-8 mục. "
            "Các mục KHÔNG được trùng lặp về nội dung."
        ),
    )
    requirements: str = Field(
        ...,
        description=(
            "Yêu cầu ứng viên: trình độ học vấn, kinh nghiệm, kỹ năng cứng, "
            "kỹ năng mềm, chứng chỉ. Viết dạng liệt kê bullet points."
        ),
    )
    benefits: str = Field(
        ...,
        description=(
            "Quyền lợi ứng viên nhận được: lương thưởng, bảo hiểm, "
            "môi trường làm việc, cơ hội phát triển. Viết dạng liệt kê."
        ),
    )


class BenchmarkCriterion(BaseModel):
    """A single benchmark criterion for candidate evaluation.

    Used in Phase 5 (Scoring) to compare CV against JD requirements.
    """
    name: str = Field(
        ...,
        description="Tên tiêu chí đánh giá, ví dụ: 'Kỹ năng Java Spring Boot'",
    )
    weight: int = Field(
        ...,
        ge=5,
        le=50,
        description=(
            "Trọng số phần trăm (5-50%). "
            "Tổng weight của tất cả criteria phải bằng 100."
        ),
    )
    standard_requirement: str = Field(
        ...,
        alias="standardRequirement",
        description=(
            "Mô tả cụ thể yêu cầu chuẩn cho tiêu chí này. "
            "Ví dụ: '3+ năm kinh nghiệm làm việc với Java và Spring Boot framework'. "
            "KHÔNG được để trống."
        ),
    )
    category: BenchmarkCategory = Field(
        ...,
        description="Phân loại tiêu chí: TECHNICAL, SOFT_SKILL, EDUCATION, EXPERIENCE, CERTIFICATION, LANGUAGE, OTHER",
    )
    is_must_have: bool = Field(
        ...,
        alias="isMustHave",
        description=(
            "True nếu đây là tiêu chí bắt buộc (ứng viên PHẢI đáp ứng). "
            "False nếu là tiêu chí ưu tiên (nice-to-have)."
        ),
    )

    model_config = {"populate_by_name": True}


class BenchmarkResult(BaseModel):
    """LLM output for benchmark criteria generation."""
    criteria: list[BenchmarkCriterion] = Field(
        ...,
        min_length=3,
        max_length=7,
        description=(
            "Danh sách 4-5 tiêu chí đánh giá (tối thiểu 3, tối đa 7). "
            "Tổng weight phải bằng 100%."
        ),
    )


# ============================================================
# API Request Models
# ============================================================

class JDGenerateRequest(BaseModel):
    """Request to generate a JD + benchmark criteria from basic input."""
    title: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Tên vị trí tuyển dụng, ví dụ: 'Senior Java Developer'",
        examples=["Senior Java Developer", "Frontend React Engineer"],
    )
    level: str | None = Field(
        None,
        description="Cấp bậc: Junior, Middle, Senior, Lead, Manager...",
        examples=["Senior", "Junior"],
    )
    skills: list[str] | None = Field(
        None,
        description="Danh sách kỹ năng yêu cầu",
        examples=[["Java", "Spring Boot", "PostgreSQL"]],
    )
    experience: str | None = Field(
        None,
        description="Yêu cầu kinh nghiệm, ví dụ: '3+ năm'",
        examples=["3+ năm", "1-2 năm kinh nghiệm"],
    )
    notes: str | None = Field(
        None,
        max_length=1000,
        description="Ghi chú bổ sung: ngành nghề, dự án cụ thể, văn hóa công ty...",
    )


class BenchmarkGenerateRequest(BaseModel):
    """Request to generate benchmark criteria from an existing JD."""
    job_description: str = Field(
        ...,
        alias="jobDescription",
        min_length=50,
        description=(
            "Nội dung JD đầy đủ (mô tả + yêu cầu + quyền lợi). "
            "Tối thiểu 50 ký tự."
        ),
    )

    model_config = {"populate_by_name": True}


# ============================================================
# API Response Models
# ============================================================

class JDProvenance(BaseModel):
    """Metadata about how the JD/benchmark was generated."""
    model_used: str = Field(..., description="LLM model that produced the output")
    prompt_version: str = Field(..., description="Version of the generation prompt")
    fallback_used: bool = Field(False, description="Whether fallback model was used")
    input_tokens: int = Field(0, description="Input tokens consumed")
    output_tokens: int = Field(0, description="Output tokens consumed")
    estimated_cost_usd: float = Field(0.0, description="Estimated cost in USD")
    processing_time_ms: int = Field(0, description="Processing time in milliseconds")


class JDGenerateResponse(BaseModel):
    """Response from the JD generation endpoint."""
    status: str = Field("success", description="Generation status: success or error")
    jd: GeneratedJD | None = Field(None, description="Generated JD content")
    benchmark_criteria: list[BenchmarkCriterion] | None = Field(
        None,
        alias="benchmarkCriteria",
        description="Generated benchmark criteria",
    )
    provenance: JDProvenance
    error_message: str | None = Field(None, alias="errorMessage")

    model_config = {"populate_by_name": True}


class BenchmarkGenerateResponse(BaseModel):
    """Response from the benchmark generation endpoint."""
    status: str = Field("success", description="Generation status: success or error")
    criteria: list[BenchmarkCriterion] | None = Field(
        None,
        description="Generated benchmark criteria",
    )
    provenance: JDProvenance
    error_message: str | None = Field(None, alias="errorMessage")

    model_config = {"populate_by_name": True}
