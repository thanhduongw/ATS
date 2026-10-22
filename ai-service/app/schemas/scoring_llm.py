"""
Schemas đầu ra của Gemini khi chấm (response_model cho structured output).

Thiết kế (docs/DE_XUAT_CHAM_DIEM_CV.md, "Nguyên tắc chung", Bước 3 và 4):
- LLM KHÔNG cho điểm số: không có trường điểm nào trong file này. Code tính điểm và xếp loại (Bước 5, 6).
- LLM chỉ chấm 3 tiêu chí cần đọc hiểu (Kỹ năng, Kinh nghiệm liên quan, Lĩnh vực), xét độ phù hợp ngành học,
  và kiểm tra các yêu cầu bắt buộc loại kỹ năng / chứng chỉ / lĩnh vực.
- Số năm và bậc học do code chấm, nên không có ở đây.
- Mỗi mức kèm dẫn chứng trích NGUYÊN VĂN từ hồ sơ; chỉ dựa vào điều CV ghi, không suy đoán.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator

from app.schemas.scoring import RequirementStatus


# [GIẢI THÍCH] 3 tiêu chí LLM chấm (Bước 3). Giá trị trùng tên ScoringDimension để code ghép thẳng vào kết quả cuối.
# SENIORITY và EDUCATION_CERTIFICATION (phần bậc học) do code chấm nên không có ở đây -> LLM không thể trả mức cho chúng.
class LLMDimension(str, Enum):
    TECHNICAL_SKILLS = "TECHNICAL_SKILLS"
    RELEVANT_EXPERIENCE = "RELEVANT_EXPERIENCE"
    DOMAIN = "DOMAIN"


# [GIẢI THÍCH] Đánh giá MỘT tiêu chí theo thang có neo (BARS, Smith & Kendall, 1963): mức 0–4 theo mô tả mức riêng
# của tiêu chí đó (prompt phần 4 đưa mô tả). level: Field(..., ge=0, le=4) -> AI trả 5 hay "cao" là bị từ chối.
# evidence bắt buộc trích nguyên văn để HR kiểm chứng được và giảm việc AI bịa (Bước 3, "Yêu cầu với LLM").
class DimensionAssessment(BaseModel):
    dimension: LLMDimension = Field(..., description="Tên tiêu chí đang đánh giá")
    applicable: bool = Field(
        ...,
        description="False nếu JD hoàn toàn không nhắc tới tiêu chí này (vd JD không nêu lĩnh vực nào thì DOMAIN là false)",
    )
    level: int = Field(
        ..., ge=0, le=4,
        description="Mức 0–4 theo đúng mô tả mức của tiêu chí này trong hướng dẫn; nếu applicable là false thì trả 0",
    )
    evidence: list[str] = Field(
        default_factory=list,
        description=(
            "1–3 câu trích NGUYÊN VĂN từ hồ sơ ứng viên làm dẫn chứng cho mức đã chọn; không diễn giải, không dịch. "
            "Để rỗng nếu hồ sơ không có gì liên quan"
        ),
    )
    reason: str = Field(..., description="1–2 câu tiếng Việt giải thích vì sao chọn mức này, so với yêu cầu của JD")


# [GIẢI THÍCH] Độ phù hợp ngành học — phần LLM của tiêu chí Học vấn và chứng chỉ (Bước 3).
# Code so bậc học; LLM chỉ xét ngành vì cần hiểu nghĩa ("Kỹ thuật phần mềm" gần "Công nghệ thông tin").
# Code dùng giá trị này để phân biệt mức 1 / 2 / 3 của tiêu chí Học vấn.
# EXACT gồm cả trường hợp JD không giới hạn ngành, theo mức 3 ở Bước 3: "đúng ngành (hoặc JD không giới hạn ngành)".
class FieldMatch(str, Enum):
    EXACT = "EXACT"          # Đúng ngành JD nêu, hoặc JD không giới hạn ngành
    RELATED = "RELATED"      # Ngành gần
    UNRELATED = "UNRELATED"  # Ngành không liên quan
    UNKNOWN = "UNKNOWN"      # CHỈ khi hồ sơ không ghi ngành học


class EducationFieldAssessment(BaseModel):
    match: FieldMatch = Field(
        ...,
        description=(
            "So ngành học trong hồ sơ với các ngành JD chấp nhận: EXACT = đúng ngành JD nêu, hoặc JD không giới hạn ngành; "
            "RELATED = ngành gần; UNRELATED = ngành không liên quan; UNKNOWN = CHỈ dùng khi hồ sơ không ghi ngành học"
        ),
    )
    evidence: str | None = Field(None, description="Câu trích NGUYÊN VĂN từ hồ sơ nêu ngành học; null nếu không có")


# [GIẢI THÍCH] Loại yêu cầu LLM được kiểm tra (bảng Bước 4): chỉ kỹ năng, chứng chỉ, lĩnh vực; số năm và bậc học
# do code kiểm tra. Enum riêng để schema gửi Gemini chỉ có 3 lựa chọn, LLM không thể chấm chồng phần của code.
# Giá trị chữ trùng RequirementCategory; khi cần, code đổi bằng RequirementCategory(check.category.value).
class LLMRequirementCategory(str, Enum):
    SKILL = "SKILL"
    CERTIFICATION = "CERTIFICATION"
    DOMAIN = "DOMAIN"


# [GIẢI THÍCH] Kết quả LLM kiểm tra MỘT yêu cầu bắt buộc (Bước 4). Chỉ loại SKILL / CERTIFICATION / DOMAIN;
# số năm và bậc học do code kiểm tra. requirement phải giống hệt tên trong ExtractedJD để code ghép lại đúng mục.
# UNKNOWN = hồ sơ không đủ thông tin để biết (không phải AI lỗi).
class RequirementCheck(BaseModel):
    requirement: str = Field(..., description="Tên yêu cầu, chép GIỐNG HỆT tên trong danh sách yêu cầu cần kiểm tra")
    category: LLMRequirementCategory = Field(..., description="Loại yêu cầu: SKILL (kỹ năng), CERTIFICATION (chứng chỉ) hoặc DOMAIN (lĩnh vực)")
    status: RequirementStatus = Field(
        ...,
        description=(
            "MET nếu hồ sơ cho thấy rõ đáp ứng; UNMET nếu hồ sơ đủ thông tin và cho thấy không đáp ứng; "
            "UNKNOWN nếu hồ sơ không ghi đủ thông tin để biết"
        ),
    )
    evidence: str | None = Field(None, description="Câu trích NGUYÊN VĂN từ hồ sơ làm dẫn chứng; null nếu không có")


# [GIẢI THÍCH] TOÀN BỘ những gì Gemini được phép trả về khi chấm: 3 đánh giá tiêu chí + độ phù hợp ngành học
# + trạng thái từng yêu cầu cần kiểm tra + tóm tắt. Không có trường nào để AI ghi điểm số.
class LLMScoringOutput(BaseModel):
    dimensions: list[DimensionAssessment] = Field(
        ..., min_length=3, max_length=3,
        description="Đúng 3 tiêu chí TECHNICAL_SKILLS, RELEVANT_EXPERIENCE, DOMAIN, mỗi tiêu chí đúng một lần",
    )
    education_field: EducationFieldAssessment = Field(..., description="Độ phù hợp giữa ngành học trong hồ sơ và ngành JD yêu cầu")
    requirement_checks: list[RequirementCheck] = Field(
        default_factory=list,
        description="Mỗi yêu cầu trong danh sách cần kiểm tra đúng một mục, theo đúng thứ tự đã cho",
    )
    summary: str = Field(
        ...,
        description="Nhận xét tổng quan 2–3 câu tiếng Việt về điểm mạnh và điểm thiếu của hồ sơ so với JD; KHÔNG nêu điểm số",
    )

    # [GIẢI THÍCH] Mỗi tiêu chí đúng một lần: thiếu hoặc trùng thì từ chối để gọi lại, không đoán.
    @field_validator("dimensions")
    @classmethod
    def _each_dimension_once(cls, v: list[DimensionAssessment]) -> list[DimensionAssessment]:
        if {d.dimension for d in v} != set(LLMDimension):
            raise ValueError("Cần đúng 3 tiêu chí TECHNICAL_SKILLS, RELEVANT_EXPERIENCE, DOMAIN, mỗi tiêu chí một lần")
        return v
