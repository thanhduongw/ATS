"""
Schemas trích xuất JD thành danh sách yêu cầu có cấu trúc (Bước 1 trong docs/DE_XUAT_CHAM_DIEM_CV.md).

Thiết kế:
- Mỗi nội dung JD chỉ tách MỘT lần, mọi CV ứng tuyển vị trí đó được so với cùng danh sách này.
- Cơ sở: phân tích công việc (job analysis, Brannick, Cadle & Levine, 2012); chia nhóm theo O*NET Content Model.
- LLM chỉ tách và GIỮ NGUYÊN CHỮ JD ghi (vd "Đại học"); việc đổi ra bậc Khung trình độ quốc gia do code làm (phần 3).
- KHÔNG có lương, quyền lợi: thuộc Workforce Characteristics, không dùng để chấm CV (Bước 2).
- KHÔNG có kỹ năng mềm: thuộc Worker Characteristics, CV không thể hiện đáng tin, suy đoán dễ gây thiên vị (Bước 2).
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


# [GIẢI THÍCH] Bắt buộc hay ưu tiên (Bước 1). Từ khóa nhận biết:
# - REQUIRED: "bắt buộc", "tối thiểu", "yêu cầu", "required", "must", "minimum".
# - PREFERRED: "ưu tiên", "là lợi thế", "là điểm cộng", "preferred", "nice to have", "a plus".
# Yêu cầu bắt buộc dùng cho Bước 4 (kiểm tra riêng); ưu tiên chỉ ảnh hưởng mức 4 ở Bước 3.
class Importance(str, Enum):
    REQUIRED = "REQUIRED"
    PREFERRED = "PREFERRED"


IMPORTANCE_LABELS: dict[Importance, str] = {
    Importance.REQUIRED: "Bắt buộc",
    Importance.PREFERRED: "Ưu tiên",
}

_IMPORTANCE_DESCRIPTION = (
    "REQUIRED nếu JD ghi 'bắt buộc', 'tối thiểu', 'required', 'must' hoặc liệt kê trong mục yêu cầu mà không kèm từ ưu tiên; "
    "PREFERRED nếu JD ghi 'ưu tiên', 'là lợi thế', 'là điểm cộng', 'preferred', 'nice to have', 'a plus'"
)


# [GIẢI THÍCH] Một yêu cầu đơn lẻ: kỹ năng, chứng chỉ hoặc lĩnh vực. Mỗi mục đúng MỘT thứ để LLM kiểm tra từng cái
# ở Bước 4 và để đo độ chính xác trích xuất (precision/recall theo từng tên).
# source_text giữ câu gốc trong JD để người đọc đối chiếu.
class RequirementItem(BaseModel):
    name: str = Field(
        ...,
        description=(
            "Tên chuẩn, ngắn gọn của MỘT yêu cầu (một kỹ năng, một chứng chỉ hoặc một lĩnh vực), "
            "vd 'Java', 'Spring Boot', 'AWS Certified Solutions Architect', 'Ngân hàng'. "
            "Không gộp nhiều thứ vào một mục"
        ),
    )
    importance: Importance = Field(..., description=_IMPORTANCE_DESCRIPTION)
    source_text: str | None = Field(None, description="Câu gốc trong JD nêu yêu cầu này, chép nguyên văn")


# [GIẢI THÍCH] Yêu cầu số năm kinh nghiệm — O*NET Experience Requirements: Experience and Training.
# min_years là N trong bảng mức của tiêu chí Số năm (Bước 3); code đổi ra 11 khoảng O*NET để so.
# JD không ghi số thì min_years = null -> tiêu chí Số năm không áp dụng.
class ExperienceRequirement(BaseModel):
    min_years: float | None = Field(
        None, ge=0,
        description=(
            "Số năm kinh nghiệm tối thiểu JD yêu cầu, đổi ra năm: '3 năm' = 3, '6 tháng' = 0.5, '2-3 năm' = 2. "
            "JD không ghi con số thì để null, không tự suy ra từ cấp bậc"
        ),
    )
    seniority: str | None = Field(
        None,
        description="Cấp bậc JD ghi, giữ nguyên chữ (vd 'Senior', 'Junior', 'Trưởng nhóm'); null nếu không ghi",
    )
    importance: Importance = Field(..., description=_IMPORTANCE_DESCRIPTION)
    source_text: str | None = Field(None, description="Câu gốc trong JD nêu yêu cầu kinh nghiệm, chép nguyên văn")


# [GIẢI THÍCH] Yêu cầu học vấn — O*NET Worker Requirements: Education.
# degree_text GIỮ NGUYÊN CHỮ JD ghi; LLM KHÔNG đổi ra bậc. Code đổi ra bậc Khung trình độ quốc gia Việt Nam ở phần 3
# (Quyết định 39/2026/QĐ-TTg) để kết quả lặp lại được và giải thích được ("Nguyên tắc chung").
class EducationRequirement(BaseModel):
    degree_text: str | None = Field(
        None,
        description=(
            "Bằng cấp JD yêu cầu, GIỮ NGUYÊN CHỮ trong JD (vd 'Tốt nghiệp Đại học', 'Cao đẳng trở lên', "
            "\"Bachelor's degree\"); không đổi sang bậc hay từ khác; null nếu JD không nêu bằng cấp"
        ),
    )
    fields: list[str] = Field(
        default_factory=list,
        description="Các ngành học JD chấp nhận (vd 'Công nghệ thông tin', 'Khoa học máy tính'); để rỗng nếu JD không giới hạn ngành",
    )
    importance: Importance = Field(..., description=_IMPORTANCE_DESCRIPTION)
    source_text: str | None = Field(None, description="Câu gốc trong JD nêu yêu cầu học vấn, chép nguyên văn")


# [GIẢI THÍCH] KHUÔN JD SAU TRÍCH XUẤT (response_model cho Gemini ở Bước 1; lưu bảng jd_extractions).
# Ánh xạ O*NET từng trường (bảng Bước 1):
# - skills         -> Worker Requirements: Skills (chỉ kỹ năng chuyên môn, công cụ; KHÔNG gồm kỹ năng mềm)
# - tasks          -> Occupation-Specific Information: Tasks (dùng cho tiêu chí Kinh nghiệm liên quan)
# - experience     -> Experience Requirements: Experience and Training
# - education      -> Worker Requirements: Education
# - certifications -> Experience Requirements: Licensing
# - domains        -> Worker Requirements: Knowledge
# Không có lương / quyền lợi (Workforce Characteristics) và kỹ năng mềm (Worker Characteristics) vì Bước 2 không chấm.
# Mọi danh sách mặc định rỗng: JD không nêu thì để rỗng, không bịa.
class ExtractedJD(BaseModel):
    job_title: str | None = Field(None, description="Tên vị trí tuyển dụng như JD ghi; null nếu không có")
    skills: list[RequirementItem] = Field(
        default_factory=list,
        description=(
            "Kỹ năng chuyên môn, ngôn ngữ, framework, công cụ JD yêu cầu; mỗi mục một kỹ năng. "
            "KHÔNG đưa kỹ năng mềm (giao tiếp, làm việc nhóm, chịu áp lực...)"
        ),
    )
    tasks: list[str] = Field(
        default_factory=list,
        description=(
            "Các nhiệm vụ chính của vị trí, mỗi mục một câu ngắn, GIỮ NGÔN NGỮ GỐC của JD, không dịch "
            "(vd 'Xây dựng API', 'Design database schemas')"
        ),
    )
    experience: ExperienceRequirement | None = Field(
        None, description="Yêu cầu số năm kinh nghiệm và cấp bậc; null nếu JD không nêu gì về kinh nghiệm",
    )
    education: EducationRequirement | None = Field(
        None, description="Yêu cầu bằng cấp và ngành học; null nếu JD không nêu gì về học vấn",
    )
    certifications: list[RequirementItem] = Field(
        default_factory=list,
        description="Chứng chỉ nghề nghiệp JD yêu cầu (vd AWS, PMP, ISTQB); mỗi mục một chứng chỉ; rỗng nếu không có",
    )
    domains: list[RequirementItem] = Field(
        default_factory=list,
        description=(
            "Lĩnh vực, ngành nghiệp vụ JD nêu (vd 'Ngân hàng', 'Thương mại điện tử'). Chỉ ghi lĩnh vực mà JD yêu cầu "
            "ứng viên có kinh nghiệm hoặc hiểu biết; không ghi ngành kinh doanh của chính công ty nếu JD không yêu cầu "
            "ứng viên có kinh nghiệm ngành đó. Rỗng nếu không có"
        ),
    )
