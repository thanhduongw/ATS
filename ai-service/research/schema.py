"""Schemas RIÊNG của nghiên cứu SSRC 2026; không dùng thang production 0--4."""
from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Dimension = Literal["WORK_EXPERIENCE", "SKILLS", "EDUCATION", "CERTIFICATIONS", "PROJECT", "LANGUAGE"]
Priority = Literal["REQUIRED", "PREFERRED"]
CertPolicy = Literal["REQUIRED", "PREFERRED", "NOT_SPECIFIED"]

class Fact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Dimension
    quote: str = Field(min_length=2, description="Trích một đoạn có thật trong CV đã loại PII")
    note: str = Field(description="Giải thích ngắn bằng tiếng Việt, không suy đoán")

class CVFacts(BaseModel):
    model_config = ConfigDict(extra="forbid")
    facts: list[Fact] = Field(description="Các dữ kiện từ CV; trích nguyên văn, gồm kinh nghiệm, dự án, kỹ năng, học vấn, chứng chỉ và ngoại ngữ")
    limitations: list[str] = Field(default_factory=list)

class Requirement(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dimension: Literal["WORK_EXPERIENCE", "SKILLS", "EDUCATION", "CERTIFICATIONS"]
    priority: Priority
    requirement: str = Field(min_length=2, description="Yêu cầu được chuẩn hóa, không thêm tiêu chuẩn mới")
    quote: str = Field(min_length=2, description="Trích đoạn nguyên văn của JD")

class JDFacts(BaseModel):
    model_config = ConfigDict(extra="forbid")
    job_title: str
    requirements: list[Requirement]
    limitations: list[str] = Field(default_factory=list)

class Rating(BaseModel):
    model_config = ConfigDict(extra="forbid")
    score: int | None = Field(description="Điểm 1--5 hoặc null chỉ khi Certifications N/A")
    reason: str = Field(min_length=5, description="Giải thích ngắn dựa trên CV và JD")
    cv_evidence: list[str] = Field(default_factory=list, description="Trích nguyên văn CV, hoặc [] nếu không có bằng chứng")
    jd_evidence: list[str] = Field(default_factory=list, description="Trích nguyên văn JD, hoặc [] nếu JD không có yêu cầu")

    @model_validator(mode="after")
    def check_range(self):
        if self.score is not None and (type(self.score) is not int or not 1 <= self.score <= 5):
            raise ValueError("Thang 1--5, null chỉ cho Certifications N/A")
        return self

class ScoreFour(BaseModel):
    model_config = ConfigDict(extra="forbid")
    work_experience: Rating
    skills: Rating
    education: Rating
    certifications: Rating

DIMENSION_FIELDS = {
    "work_experience": "WORK_EXPERIENCE",
    "skills": "SKILLS",
    "education": "EDUCATION",
    "certifications": "CERTIFICATIONS",
}


def validate_scoring(output: ScoreFour, policy: CertPolicy, *, config: str) -> None:
    for key in ("work_experience", "skills", "education"):
        if getattr(output, key).score is None:
            raise ValueError(f"{key}: không cho phép N/A")
    cert = output.certifications
    if policy == "NOT_SPECIFIED":
        if cert.score is not None:
            raise ValueError("JD không đề cập chứng chỉ: Certifications phải N/A (null)")
    elif cert.score is None:
        raise ValueError("JD có yêu cầu chứng chỉ: Certifications phải được chấm 1--5")
    if config == "B":
        for key in DIMENSION_FIELDS:
            r = getattr(output, key)
            if key != "certifications" or policy != "NOT_SPECIFIED":
                if not r.reason.strip():
                    raise ValueError(f"Prompt B thiếu reason: {key}")
