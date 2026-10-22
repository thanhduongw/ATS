"""
Schemas kết quả chấm mức độ phù hợp CV ↔ JD (thiết kế 6 bước).

Thiết kế: docs/DE_XUAT_CHAM_DIEM_CV.md (mọi quyết định bám theo file này).
- File này chỉ chứa (1) enum dùng chung và (2) KẾT QUẢ CUỐI do code tạo, lưu vào ai_scores.result.
- Những gì Gemini được trả về khi chấm nằm ở app/schemas/scoring_llm.py (không có trường điểm số).
- Khuôn JD sau trích xuất (Bước 1) nằm ở app/schemas/jd_extraction.py.
- Code tính điểm 0–100 (trọng số bằng nhau, Bước 5) và xếp loại 3 trạng thái (Bước 6).
"""

from __future__ import annotations

from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


# ============================================================
# (1) Enum dùng chung
# ============================================================

# [GIẢI THÍCH] 5 tiêu chí cố định theo O*NET Content Model (Bước 2). Kiểu enum: tên khác 5 tên này -> bị từ chối.
# Ánh xạ O*NET:
# - TECHNICAL_SKILLS        -> Worker Requirements: Skills
# - RELEVANT_EXPERIENCE     -> Occupation-Specific Information: Tasks
# - SENIORITY               -> Experience Requirements: Experience and Training (số năm, 11 khoảng)
# - EDUCATION_CERTIFICATION -> Worker Requirements: Education; Experience Requirements: Licensing
# - DOMAIN                  -> Worker Requirements: Knowledge
# Giữ nguyên tên enum cũ để dữ liệu đã lưu và phía Java không phải đổi; chỉ đổi nhãn hiển thị.
class ScoringDimension(str, Enum):
    TECHNICAL_SKILLS = "TECHNICAL_SKILLS"
    RELEVANT_EXPERIENCE = "RELEVANT_EXPERIENCE"
    SENIORITY = "SENIORITY"
    EDUCATION_CERTIFICATION = "EDUCATION_CERTIFICATION"
    DOMAIN = "DOMAIN"


DIMENSION_LABELS: dict[ScoringDimension, str] = {
    ScoringDimension.TECHNICAL_SKILLS: "Kỹ năng chuyên môn",
    ScoringDimension.RELEVANT_EXPERIENCE: "Kinh nghiệm liên quan",
    ScoringDimension.SENIORITY: "Số năm kinh nghiệm",
    ScoringDimension.EDUCATION_CERTIFICATION: "Học vấn và chứng chỉ",
    ScoringDimension.DOMAIN: "Lĩnh vực, ngành",
}


# [GIẢI THÍCH] Ai chấm một tiêu chí / ai kiểm tra một yêu cầu (Bước 3, 4, "Nguyên tắc chung"):
# CODE = quy tắc rõ ràng (số năm, bậc học); LLM = cần đọc hiểu (kỹ năng, kinh nghiệm, lĩnh vực);
# CODE_AND_LLM = code so bậc học + LLM xét độ phù hợp ngành và chứng chỉ (tiêu chí Học vấn và chứng chỉ).
# Ghi rõ để HR và hội đồng biết phần nào lặp lại được tuyệt đối, phần nào phụ thuộc AI.
class ScoredBy(str, Enum):
    CODE = "CODE"
    LLM = "LLM"
    CODE_AND_LLM = "CODE_AND_LLM"


# [GIẢI THÍCH] 3 trạng thái xếp loại (Bước 6): AI chỉ GỢI Ý, HR quyết định; không tự loại hay tự duyệt CV.
# UNCLASSIFIED = tùy chọn từ chối phân loại (Chow, 1970): không chắc chắn thì để HR xem tay.
# Thay hẳn bộ cũ GOOD_FIT / POTENTIAL_FIT / NOT_FIT.
class Tier(str, Enum):
    FIT = "FIT"
    NOT_FIT = "NOT_FIT"
    UNCLASSIFIED = "UNCLASSIFIED"


TIER_LABELS: dict[Tier, str] = {
    Tier.FIT: "Phù hợp",
    Tier.NOT_FIT: "Không phù hợp",
    Tier.UNCLASSIFIED: "Chưa phân loại",
}


# [GIẢI THÍCH] Trạng thái của MỘT yêu cầu bắt buộc (Bước 4, mô hình sàng lọc nhiều vòng — multiple hurdle).
# UNKNOWN = CV không ghi đủ thông tin để biết đạt hay không (vd CV không ghi ngành học).
# KHÁC với AI lỗi (gọi Gemini lỗi, không đọc được file): khi đó cả lần chấm có status FAILED ở bảng ai_scores,
# không dùng 3 trạng thái này.
class RequirementStatus(str, Enum):
    MET = "MET"
    UNMET = "UNMET"
    UNKNOWN = "UNKNOWN"


REQUIREMENT_STATUS_LABELS: dict[RequirementStatus, str] = {
    RequirementStatus.MET: "Đạt",
    RequirementStatus.UNMET: "Không đạt",
    RequirementStatus.UNKNOWN: "Không xác định được",
}


# [GIẢI THÍCH] Loại yêu cầu bắt buộc (bảng "Loại yêu cầu bắt buộc" ở Bước 4):
# EXPERIENCE_YEARS, EDUCATION_LEVEL -> code kiểm tra; SKILL, CERTIFICATION, DOMAIN -> LLM kiểm tra kèm dẫn chứng.
class RequirementCategory(str, Enum):
    SKILL = "SKILL"
    CERTIFICATION = "CERTIFICATION"
    DOMAIN = "DOMAIN"
    EXPERIENCE_YEARS = "EXPERIENCE_YEARS"
    EDUCATION_LEVEL = "EDUCATION_LEVEL"


REQUIREMENT_CATEGORY_LABELS: dict[RequirementCategory, str] = {
    RequirementCategory.SKILL: "Kỹ năng",
    RequirementCategory.CERTIFICATION: "Chứng chỉ",
    RequirementCategory.DOMAIN: "Lĩnh vực, ngành",
    RequirementCategory.EXPERIENCE_YEARS: "Số năm kinh nghiệm",
    RequirementCategory.EDUCATION_LEVEL: "Bậc học",
}


# ============================================================
# (2) Kết quả cuối (code tạo, lưu vào ai_scores.result)
# ============================================================

# [GIẢI THÍCH] Một tiêu chí SAU KHI gộp mức từ code và LLM (Bước 3 + 5).
# Trọng số bằng nhau (Dawes, 1979): weight = 1/k với k = số tiêu chí áp dụng; tiêu chí không áp dụng có weight = 0.
# Vì vậy bỏ cặp weight / effective_weight cũ (không còn trọng số gốc tự đặt 35/25/15/10/15).
class ScoredDimension(BaseModel):
    dimension: ScoringDimension = Field(..., description="Tên tiêu chí (1 trong 5 tiêu chí O*NET)")
    label: str = Field(..., description="Nhãn tiếng Việt hiển thị cho HR, lấy từ DIMENSION_LABELS")
    applicable: bool = Field(..., description="False nếu JD không nhắc tới tiêu chí này; khi đó không tính vào điểm")
    level: int | None = Field(
        None, ge=0, le=4,
        description="Mức 0–4 theo mô tả mức riêng của tiêu chí (Bước 3); None nếu không áp dụng",
    )
    score: float | None = Field(
        None, ge=0, le=100,
        description="Điểm tiêu chí = mức / 4 × 100; None nếu không áp dụng",
    )
    weight: float = Field(
        ..., ge=0, le=1,
        description="Trọng số thực tế = 1 / số tiêu chí được tính điểm; 0 nếu tiêu chí không được tính",
    )
    scored_by: ScoredBy = Field(..., description="Ai chấm tiêu chí này: code, LLM, hay code kết hợp LLM")
    evidence: list[str] = Field(
        default_factory=list,
        description="Dẫn chứng trích nguyên văn từ hồ sơ (với tiêu chí LLM chấm) hoặc dữ kiện code dùng để tính",
    )
    reason: str = Field("", description="Giải thích ngắn bằng tiếng Việt vì sao được mức này")


# [GIẢI THÍCH] Kết quả kiểm tra MỘT yêu cầu bắt buộc (Bước 4). Số năm, bậc học: code kiểm tra;
# kỹ năng, chứng chỉ, lĩnh vực: LLM kiểm tra kèm dẫn chứng. Thay danh sách must_have_unmet cũ (chỉ có chuỗi, không trạng thái).
class RequirementResult(BaseModel):
    requirement: str = Field(..., description="Tên yêu cầu, giống tên trong danh sách yêu cầu JD đã trích xuất")
    category: RequirementCategory = Field(..., description="Loại yêu cầu: kỹ năng, chứng chỉ, lĩnh vực, số năm, bậc học")
    status: RequirementStatus = Field(..., description="Đạt / Không đạt / Không xác định được")
    status_label: str = Field(..., description="Nhãn tiếng Việt của trạng thái, lấy từ REQUIREMENT_STATUS_LABELS")
    checked_by: ScoredBy = Field(..., description="Ai kiểm tra yêu cầu này: code hay LLM")
    evidence: str | None = Field(
        None,
        description="Dẫn chứng từ hồ sơ (câu trích hoặc dữ kiện code dùng); None nếu không có gì để dẫn",
    )


# [GIẢI THÍCH] KẾT QUẢ CUỐI (code tạo, lưu vào ai_scores.result). Đúng danh sách ở cuối Bước 6:
# điểm tổng, mức + dẫn chứng từng tiêu chí, danh sách yêu cầu bắt buộc kèm trạng thái, lý do xếp loại.
# threshold (T) và uncertainty (δ) lưu kèm để biết lần chấm dùng ngưỡng nào (ngưỡng sẽ được hiệu chỉnh lại).
class ScoreResult(BaseModel):
    total_score: float | None = Field(
        None, ge=0, le=100,
        description="Điểm tổng 0–100 = trung bình điểm các tiêu chí áp dụng (Bước 5); None nếu không tính được",
    )
    tier: Tier = Field(..., description="Xếp loại gợi ý: Phù hợp / Không phù hợp / Chưa phân loại (Bước 6)")
    tier_label: str = Field(..., description="Nhãn tiếng Việt của xếp loại, lấy từ TIER_LABELS")
    tier_reason: str = Field(..., description="Lý do xếp loại bằng tiếng Việt, nêu quy tắc nào của Bước 6 được áp dụng")
    dimensions: list[ScoredDimension] = Field(..., description="Đủ 5 tiêu chí, kể cả tiêu chí không áp dụng")
    requirements: list[RequirementResult] = Field(
        default_factory=list,
        description="Mọi yêu cầu bắt buộc của JD kèm trạng thái Đạt / Không đạt / Không xác định được",
    )
    threshold: float = Field(..., description="Ngưỡng T dùng khi xếp loại (khởi đầu 62,5)")
    uncertainty: float = Field(..., ge=0, description="Độ rộng vùng không chắc chắn δ quanh T (khởi đầu 5)")
    summary: str = Field(..., description="Tóm tắt nguyên văn của LLM, không nêu điểm")
    comment: str = Field(..., description="Nhận xét hiển thị cho HR: câu mở đầu do code ghép theo điểm và xếp loại + tóm tắt của LLM")
    years_calculated: float | None = Field(None, description="Số năm kinh nghiệm code tính từ mốc thời gian trong CV, tại ngày chấm")
    years_claimed: float | None = Field(None, description="Số năm kinh nghiệm ứng viên tự ghi trong CV")
    scored_on: date = Field(..., description="Ngày chấm (dùng để tính số năm cho công việc đang làm)")


# ============================================================
# (3) Truy vết
# ============================================================

# [GIẢI THÍCH] Thông tin truy vết: model nào, prompt phiên bản mấy, bản trích xuất CV và JD nào, bao nhiêu token,
# chi phí, thời gian. Thêm jd_extraction_* vì từ Bước 1 điểm phụ thuộc vào bản trích xuất JD (bảng jd_extractions).
class ScoringProvenance(BaseModel):
    model: str
    prompt_version: str
    scoring_version: str
    extraction_id: int | None = None
    extraction_prompt_version: str | None = None
    jd_extraction_id: int | None = None
    jd_extraction_prompt_version: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    retries: int = 0
