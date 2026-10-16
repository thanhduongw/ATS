"""
Schemas chấm mức độ phù hợp CV ↔ JD.

Thiết kế (ai-service/KE_HOACH_CHAM_DIEM_CV.md):
- LLM KHÔNG cho điểm số: chỉ xác định khía cạnh nào JD có đề cập (`applicable`), xếp mức 0–4
  cho từng khía cạnh, liệt kê yêu cầu bắt buộc chưa đạt và viết tóm tắt tiếng Việt.
- Python tính điểm 0–100 (trọng số cố định, chia lại khi khía cạnh không áp dụng) và xếp loại.
"""

from __future__ import annotations

from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


# [GIẢI THÍCH] 5 tiêu chí cố định. Kiểu enum: AI trả tên khác 5 tên này -> bị từ chối.
class ScoringDimension(str, Enum):
    TECHNICAL_SKILLS = "TECHNICAL_SKILLS"
    RELEVANT_EXPERIENCE = "RELEVANT_EXPERIENCE"
    SENIORITY = "SENIORITY"
    EDUCATION_CERTIFICATION = "EDUCATION_CERTIFICATION"
    DOMAIN = "DOMAIN"


DIMENSION_LABELS: dict[ScoringDimension, str] = {
    ScoringDimension.TECHNICAL_SKILLS: "Kỹ năng chuyên môn",
    ScoringDimension.RELEVANT_EXPERIENCE: "Kinh nghiệm liên quan",
    ScoringDimension.SENIORITY: "Cấp bậc / số năm",
    ScoringDimension.EDUCATION_CERTIFICATION: "Học vấn / chứng chỉ",
    ScoringDimension.DOMAIN: "Lĩnh vực / ngành",
}


# [GIẢI THÍCH] 3 mức xếp loại: Phù hợp tốt / Tiềm năng / Chưa phù hợp.
class Tier(str, Enum):
    GOOD_FIT = "GOOD_FIT"
    POTENTIAL_FIT = "POTENTIAL_FIT"
    NOT_FIT = "NOT_FIT"


TIER_LABELS: dict[Tier, str] = {
    Tier.GOOD_FIT: "Phù hợp tốt",
    Tier.POTENTIAL_FIT: "Tiềm năng",
    Tier.NOT_FIT: "Chưa phù hợp",
}


# ============================================================
# Đầu ra LLM (response_model cho structured output)
# ============================================================

# [GIẢI THÍCH] KHUÔN ĐẦU RA CỦA AI cho MỘT tiêu chí (pydantic BaseModel ~ DTO Java có kiểm tra hợp lệ).
# level: Field(..., ge=0, le=4) = bắt buộc, số nguyên từ 0 đến 4; AI trả 5 hay "cao" -> lỗi.
class DimensionAssessment(BaseModel):
    dimension: ScoringDimension
    applicable: bool = Field(..., description="False nếu JD hoàn toàn không đề cập khía cạnh này")
    level: int = Field(
        ..., ge=0, le=4,
        description="0 không có · 1 có liên quan · 2 đạt một phần · 3 đạt · 4 vượt rõ rệt",
    )
    reason: str = Field(..., description="1–2 câu tiếng Việt giải thích mức đã chọn")


# [GIẢI THÍCH] TOÀN BỘ những gì AI được phép trả về khi chấm: 5 đánh giá + yêu cầu bắt buộc chưa đạt + tóm tắt.
# Không có trường nào để AI ghi điểm số.
class LLMScoringOutput(BaseModel):
    dimensions: list[DimensionAssessment] = Field(..., description="Đúng 5 khía cạnh, mỗi khía cạnh một lần")
    must_have_unmet: list[str] = Field(
        default_factory=list,
        description="Các yêu cầu JD ghi rõ là BẮT BUỘC mà hồ sơ chưa đáp ứng (cụm ngắn, tiếng Việt)",
    )
    summary: str = Field(..., description="Nhận xét tổng quan 2–3 câu tiếng Việt, không nêu điểm số")


# ============================================================
# Kết quả cuối (Python tính)
# ============================================================

# [GIẢI THÍCH] Một tiêu chí SAU KHI Python tính: thêm nhãn, trọng số gốc, trọng số sau chia lại, điểm 0-100.
class ScoredDimension(BaseModel):
    dimension: ScoringDimension
    label: str
    weight: float = Field(..., description="Trọng số gốc (0–1)")
    effective_weight: float = Field(..., description="Trọng số sau khi chia lại (khía cạnh không áp dụng = 0)")
    applicable: bool
    level: int | None = Field(None, description="Mức 0–4; None nếu không áp dụng")
    score: float | None = Field(None, description="0–100; None nếu không áp dụng")
    reason: str = ""


# [GIẢI THÍCH] KẾT QUẢ CUỐI (Python tạo, lưu vào ai_scores.result): điểm, xếp loại, 5 tiêu chí,
# yêu cầu bắt buộc chưa đạt, nhận xét (câu đầu Python ghép + tóm tắt AI), số năm, ngày chấm.
class ScoreResult(BaseModel):
    total_score: float = Field(..., description="0–100")
    tier: Tier
    tier_label: str
    dimensions: list[ScoredDimension]
    must_have_unmet: list[str] = Field(default_factory=list)
    comment: str = Field(..., description="Câu mở đầu do Python ghép theo điểm + tóm tắt của LLM")
    summary: str = Field(..., description="Tóm tắt nguyên văn của LLM")
    years_calculated: float | None = Field(None, description="Số năm Python tính tại ngày chấm")
    years_claimed: float | None = None
    scored_on: date


# [GIẢI THÍCH] Thông tin truy vết: model nào, prompt phiên bản mấy, bao nhiêu token, chi phí, thời gian.
class ScoringProvenance(BaseModel):
    model: str
    prompt_version: str
    scoring_version: str
    extraction_id: int | None = None
    extraction_prompt_version: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    retries: int = 0
