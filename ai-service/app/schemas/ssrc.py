"""Schema chấm CV theo nghiên cứu SSRC 2026 (chép từ `research/schema.py`, thêm kiểu kết quả của sản phẩm).

Quy trình: CV và JD được trích thành dữ kiện có câu trích nguyên văn (`CVFacts`, `JDFacts`); AI chấm 4 tiêu chí
1–5 (`ScoreFour`); code quy ra điểm 0–100 và xếp loại (`ScoreResult`). Không import từ thư mục `research/`.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# ---------------------------------------------------------------------------------------------------------------
# Phần chép nguyên từ research/schema.py
# ---------------------------------------------------------------------------------------------------------------

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
    facts: list[Fact] = Field(
        description="Các dữ kiện từ CV; trích nguyên văn, gồm kinh nghiệm, dự án, kỹ năng, học vấn, chứng chỉ và ngoại ngữ")
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
    cv_evidence: list[str] = Field(default_factory=list,
                                   description="Trích nguyên văn CV, hoặc [] nếu không có bằng chứng")
    jd_evidence: list[str] = Field(default_factory=list,
                                   description="Trích nguyên văn JD, hoặc [] nếu JD không có yêu cầu")

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

# Nhãn tiếng Việt hiển thị trên giao diện.
CRITERION_LABELS = {
    "work_experience": "Kinh nghiệm làm việc",
    "skills": "Kỹ năng",
    "education": "Học vấn",
    "certifications": "Chứng chỉ",
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


# ---------------------------------------------------------------------------------------------------------------
# Kết quả của sản phẩm (lưu trong ai_scores.result / ai_scores.provenance)
# ---------------------------------------------------------------------------------------------------------------


class Tier(str, Enum):
    FIT = "FIT"
    NOT_FIT = "NOT_FIT"
    UNCLASSIFIED = "UNCLASSIFIED"


TIER_LABELS: dict[Tier, str] = {
    Tier.FIT: "Phù hợp",
    Tier.NOT_FIT: "Không phù hợp",
    Tier.UNCLASSIFIED: "Chưa phân loại",
}


class CriterionResult(BaseModel):
    key: Literal["work_experience", "skills", "education", "certifications"]
    label: str
    score: int | None = Field(description="1–5; null khi tiêu chí không áp dụng (Chứng chỉ khi JD không nêu)")
    applicable: bool
    reason: str
    cv_evidence: list[str] = Field(default_factory=list)
    jd_evidence: list[str] = Field(default_factory=list)


class ScoreResult(BaseModel):
    total_score: float = Field(description="0–100 = trung bình các tiêu chí có điểm × 20")
    tier: Tier
    tier_label: str
    tier_reason: str
    cert_policy: CertPolicy
    criteria: list[CriterionResult]
    injection_detected: bool = False
    injection_patterns: list[str] = Field(default_factory=list)
    scored_on: str = Field(description="Ngày chấm (ISO)")


class ScoringProvenance(BaseModel):
    model: str
    prompt_versions: dict[str, str]
    prompt_hash: str
    cv_facts_id: int | None = None
    jd_facts_id: int | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    retries: int = 0
    validation_retries: int = 0
