"""
Scoring engine v2 — chấm một hồ sơ theo 6 bước của docs/DE_XUAT_CHAM_DIEM_CV.md.

Python thuần, tất định, trừ MỘT lời gọi LLM trong `score_candidate`:
- Bước 1 (trích xuất JD) đã làm trước, ở nơi gọi (jd_extraction_store) — engine nhận sẵn ExtractedJD.
- Bước 3 phần code (số năm, bậc học) và Bước 4 phần code: app/services/scoring/rules.py.
- Bước 3 phần LLM + Bước 4 phần LLM: một lời gọi Gemini với prompt v2 (app/services/scoring/prompt.py).
- Bước 5, 6 (điểm tổng, xếp loại): app/services/scoring/aggregate.py.

KHÔNG import DB / RabbitMQ / S3: benchmark trên Kaggle gọi lại đúng hàm này.
"""

from __future__ import annotations

import time
from datetime import date
from typing import Any

from app.core.llm_client import LLMManager
from app.schemas.cv_extraction import WorkExperience
from app.schemas.jd_extraction import ExtractedJD
from app.schemas.scoring import ScoreResult, ScoringProvenance
from app.schemas.scoring_llm import LLMScoringOutput
from app.services.experience import calculate_years_of_experience
from app.services.scoring import rules
from app.services.scoring.aggregate import Thresholds, assemble_result
from app.services.scoring.profile import build_scoring_profile
from app.services.scoring.prompt import PROMPT_VERSION, build_scoring_prompt

# [GIẢI THÍCH] Phiên bản cách tính điểm (quy tắc code + gộp + xếp loại). Đổi quy tắc thì tăng số này;
# lưu kèm mỗi kết quả chấm để biết điểm nào ra từ cách tính nào.
SCORING_VERSION = "v2.0"


# [GIẢI THÍCH] Số năm kinh nghiệm do code tính theo ngày chấm (gộp các khoảng chồng lấn — experience.py).
# - CV KHÔNG có mục công việc nào -> 0.0: "không có kinh nghiệm" là thông tin đã biết (mức 0 nếu JD yêu cầu có).
# - Có mục công việc nhưng không mốc thời gian nào hợp lệ -> None: "không xác định được"
#   (tiêu chí Số năm không có mức, yêu cầu số năm là Không xác định được -> Chưa phân loại, để HR xem tay).
def years_of_experience(extracted_cv: dict[str, Any], today: date) -> float | None:
    entries = extracted_cv.get("work_experience") or []
    if not entries:
        return 0.0
    jobs = [WorkExperience.model_validate(j) for j in entries]
    return calculate_years_of_experience(jobs, today)


# [GIẢI THÍCH] CHẤM MỘT HỒ SƠ (gọi từ application_scoring và benchmark):
#   code tính số năm, bậc học -> lọc hồ sơ (chấm mù) -> lập danh sách yêu cầu cần kiểm tra
#   -> ghép prompt v2 -> GỌI GEMINI một lần -> code gộp mức, tính điểm, xếp loại -> thông tin truy vết.
async def score_candidate(
    jd: ExtractedJD,
    extracted_cv: dict[str, Any],
    manager: LLMManager,
    today: date,
    *,
    candidate_names: list[str] | None = None,
    thresholds: Thresholds | None = None,
    extraction_id: int | None = None,
    extraction_prompt_version: str | None = None,
    jd_extraction_id: int | None = None,
    jd_extraction_prompt_version: str | None = None,
) -> tuple[ScoreResult, ScoringProvenance]:
    """Chấm một hồ sơ với danh sách yêu cầu JD đã trích xuất.

    Raises:
        LLMError: lời gọi LLM thất bại sau mọi lần thử lại.
    """
    started = time.monotonic()
    thresholds = thresholds or Thresholds()

    # Phần code: số năm (theo ngày chấm), số năm tự ghi, bậc học cao nhất (Khung trình độ quốc gia;
    # CV không ghi bằng mà đã học xong thì suy từ tên trường — quy ước của nhóm, kèm ghi chú).
    years_calculated = years_of_experience(extracted_cv, today)
    years_claimed = extracted_cv.get("years_of_experience_claimed")
    degree = rules.candidate_degree_level(extracted_cv.get("education") or [], today)
    candidate_degree_level, degree_note = degree.level, degree.note
    # Chưa có bậc nào hoàn thành nhưng đang học -> mô tả mục đang học (dẫn chứng "Đang học: ...").
    studying = rules.studying_text(degree.studying_entry) if degree.level is None else None
    studying_level = rules.studying_degree_level(degree.studying_entry) if degree.level is None else None

    # Chấm mù: bỏ thông tin cá nhân; danh sách yêu cầu Gemini phải kiểm tra do code lập.
    profile = build_scoring_profile(extracted_cv, candidate_names)
    items = rules.items_to_check(jd)
    prompt = build_scoring_prompt(jd, profile, today, years_calculated, years_claimed, items)

    # GỌI GEMINI: bắt AI trả JSON đúng khuôn LLMScoringOutput (3 tiêu chí, ngành học, yêu cầu, tóm tắt — không có điểm).
    output, usage = await manager.generate_structured(prompt, LLMScoringOutput)

    # Code gộp mức, tính điểm (trọng số bằng nhau) và xếp loại.
    result = assemble_result(
        jd, output,
        years_calculated=years_calculated,
        years_claimed=years_claimed,
        candidate_degree_level=candidate_degree_level,
        today=today,
        thresholds=thresholds,
        degree_note=degree_note,
        profile=profile,
        studying=studying,
        studying_level=studying_level,
    )
    provenance = ScoringProvenance(
        model=usage.model,
        prompt_version=PROMPT_VERSION,
        scoring_version=SCORING_VERSION,
        extraction_id=extraction_id,
        extraction_prompt_version=extraction_prompt_version,
        jd_extraction_id=jd_extraction_id,
        jd_extraction_prompt_version=jd_extraction_prompt_version,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        estimated_cost_usd=round(usage.estimated_cost_usd, 6),
        latency_ms=int((time.monotonic() - started) * 1000),
        retries=usage.retries,
    )
    return result, provenance
