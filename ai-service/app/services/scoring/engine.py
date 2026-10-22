"""
Scoring engine — Python thuần, tất định (trừ một lời gọi LLM trong `score_candidate`).

Điểm = Σ trọng số hiệu dụng × mức/4 × 100, trong đó:
- 5 khía cạnh, trọng số gốc 35/25/15/10/15;
- khía cạnh LLM đánh dấu không áp dụng (JD không đề cập) bị bỏ, trọng số chia lại cho phần còn lại;
- trượt yêu cầu bắt buộc CHỈ cảnh báo (không trừ điểm, không chặn trần).
Xếp loại 3 mức theo ngưỡng cấu hình (65 / 45 — hiệu chỉnh bằng benchmark, xem benchmark/results).

`compute_score` tách riêng để benchmark tính lại (đổi trọng số / ngưỡng) mà không gọi LLM.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from app.core.llm_client import LLMManager
from app.schemas.scoring import (
    DIMENSION_LABELS,
    TIER_LABELS,
    ScoredDimension,
    ScoreResult,
    ScoringDimension,
    ScoringProvenance,
    Tier,
)
# [GIẢI THÍCH] Phần 0: LLMScoringOutput chuyển sang app/schemas/scoring_llm.py; nội dung engine viết lại ở phần 6.
from app.schemas.scoring_llm import LLMScoringOutput
from app.services.experience import calculate_years_of_experience
from app.services.scoring.profile import build_scoring_profile
from app.services.scoring.prompt import PROMPT_VERSION, JobInfo, build_scoring_prompt

SCORING_VERSION = "v1.0"

# [GIẢI THÍCH] TRỌNG SỐ 5 tiêu chí (tổng = 1). Đây là GIẢ ĐỊNH THIẾT KẾ, chưa kiểm chứng bằng dữ liệu.
# Kỹ năng + Kinh nghiệm = 60% vì trả lời trực tiếp "có làm được việc ngay không". Muốn đổi thì sửa ở đây.
DEFAULT_WEIGHTS: dict[ScoringDimension, float] = {
    ScoringDimension.TECHNICAL_SKILLS: 0.35,
    ScoringDimension.RELEVANT_EXPERIENCE: 0.25,
    ScoringDimension.SENIORITY: 0.15,
    ScoringDimension.EDUCATION_CERTIFICATION: 0.10,
    ScoringDimension.DOMAIN: 0.15,
}


class NoApplicableDimensionError(ValueError):
    """LLM cho rằng JD không đề cập khía cạnh nào → không tính được điểm."""


@dataclass(frozen=True)
# [GIẢI THÍCH] NGƯỠNG XẾP LOẠI mặc định (giá trị thật đọc từ config): >= 65 Phù hợp tốt, >= 45 Tiềm năng.
# Ngưỡng này ĐO bằng benchmark (tối ưu trên tập calib 43,15 / 63,75 rồi làm tròn).
class Thresholds:
    good_min: float = 65.0
    potential_min: float = 45.0


@dataclass
class ScoringOptions:
    weights: dict[ScoringDimension, float] = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
    thresholds: Thresholds = field(default_factory=Thresholds)


# [GIẢI THÍCH] Đổi điểm thành xếp loại theo ngưỡng.
def tier_for(total: float, thresholds: Thresholds) -> Tier:
    if total >= thresholds.good_min:
        return Tier.GOOD_FIT
    if total >= thresholds.potential_min:
        return Tier.POTENTIAL_FIT
    return Tier.NOT_FIT


# [GIẢI THÍCH] Câu mở đầu nhận xét do PYTHON viết, vd "Mức độ phù hợp: Phù hợp tốt (75/100)."
# Python viết nên luôn khớp điểm. Có yêu cầu bắt buộc chưa đạt thì nối thêm danh sách (chỉ cảnh báo, không trừ điểm).
def headline(total: float, tier: Tier, must_have_unmet: list[str]) -> str:
    """Câu mở đầu nhận xét do Python ghép — luôn khớp với điểm (LLM viết tóm tắt trước khi có điểm)."""
    text = f"Mức độ phù hợp: {TIER_LABELS[tier]} ({total:g}/100)."
    if must_have_unmet:
        text += " Chưa đáp ứng yêu cầu bắt buộc: " + "; ".join(must_have_unmet) + "."
    return text


# [GIẢI THÍCH] PYTHON TÍNH ĐIỂM từ các mức AI trả về:
#   điểm tiêu chí = mức / 4 * 100   (0, 25, 50, 75, 100)
#   tổng = cộng (trọng số / tổng trọng số các tiêu chí áp dụng) * điểm tiêu chí
# Tiêu chí không áp dụng bị bỏ, trọng số chia lại cho đủ 100%.
# Ví dụ mức 1,1,2,2,1: 25*0.35 + 25*0.25 + 50*0.15 + 50*0.10 + 25*0.15 = 31.25 -> 31.2 -> Chưa phù hợp.
def compute_score(
    output: LLMScoringOutput,
    scored_on: date,
    options: ScoringOptions | None = None,
    years_calculated: float | None = None,
    years_claimed: float | None = None,
) -> ScoreResult:
    options = options or ScoringOptions()
    # Khía cạnh LLM trả trùng → lấy lần đầu; thiếu → coi như không áp dụng.
    # AI trả trùng một tiêu chí -> lấy lần đầu (setdefault).
    by_dimension: dict[ScoringDimension, Any] = {}
    for d in output.dimensions:
        by_dimension.setdefault(d.dimension, d)

    dimensions: list[ScoredDimension] = []
    # Duyệt đủ 5 tiêu chí; tiêu chí AI không trả về -> coi là không áp dụng.
    for dimension, weight in options.weights.items():
        a = by_dimension.get(dimension)
        applicable = bool(a and a.applicable)
        dimensions.append(ScoredDimension(
            dimension=dimension,
            label=DIMENSION_LABELS[dimension],
            weight=weight,
            effective_weight=0.0,
            applicable=applicable,
            level=a.level if applicable else None,
            score=a.level / 4 * 100 if applicable else None,
            reason=a.reason if a else "",
        ))

    # active = tổng trọng số các tiêu chí áp dụng (vd bỏ Lĩnh vực 15% thì active = 0.85).
    active = sum(d.weight for d in dimensions if d.applicable)
    if active <= 0:
        raise NoApplicableDimensionError("Không khía cạnh nào áp dụng được cho tin tuyển dụng này")
    # Cộng dồn: (trọng số / active) * điểm tiêu chí. effective_weight = trọng số sau khi chia lại.
    total = 0.0
    for d in dimensions:
        if d.applicable:
            d.effective_weight = round(d.weight / active, 4)
            total += d.weight / active * d.score
    total = round(total, 1)

    # Làm sạch danh sách yêu cầu bắt buộc chưa đạt (bỏ phần tử rỗng), rồi xếp loại theo ngưỡng.
    must_have_unmet = [m.strip() for m in output.must_have_unmet if m and m.strip()]
    tier = tier_for(total, options.thresholds)
    summary = output.summary.strip()
    return ScoreResult(
        total_score=total,
        tier=tier,
        tier_label=TIER_LABELS[tier],
        dimensions=dimensions,
        must_have_unmet=must_have_unmet,
        comment=f"{headline(total, tier, must_have_unmet)} {summary}".strip(),
        summary=summary,
        years_calculated=years_calculated,
        years_claimed=years_claimed,
        scored_on=scored_on,
    )


# [GIẢI THÍCH] CHẤM MỘT HỒ SƠ (gọi từ score_application). Chỉ có MỘT dòng gọi AI ở giữa:
#   Python tính số năm -> Python lọc hồ sơ (chấm mù) -> ghép prompt -> GỌI GEMINI (LLM lần 2) -> Python tính điểm.
async def score_candidate(
    job: JobInfo,
    extracted_cv: dict[str, Any],
    manager: LLMManager,
    today: date,
    *,
    candidate_names: list[str] | None = None,
    options: ScoringOptions | None = None,
    extraction_id: int | None = None,
    extraction_prompt_version: str | None = None,
) -> tuple[ScoreResult, ScoringProvenance]:
    """Chấm một hồ sơ: lọc hồ sơ → tính số năm theo `today` → một lời gọi LLM → tính điểm.

    Raises:
        LLMError: lời gọi LLM thất bại.
        NoApplicableDimensionError: không khía cạnh nào áp dụng.
    """
    from app.schemas.cv_extraction import WorkExperience

    started = time.monotonic()
    # Lấy danh sách công việc đã trích xuất, đổi thành đối tượng có kiểm tra kiểu.
    jobs = [WorkExperience.model_validate(j) for j in extracted_cv.get("work_experience") or []]
    # Số năm do Python tính (gộp khoảng chồng lấn); years_claimed = số năm ứng viên tự ghi trong CV.
    years_calculated = calculate_years_of_experience(jobs, today)
    years_claimed = extracted_cv.get("years_of_experience_claimed")

    # Chấm mù: bỏ thông tin cá nhân, chỉ giữ thông tin nghề nghiệp.
    profile = build_scoring_profile(extracted_cv, candidate_names)
    prompt = build_scoring_prompt(job, profile, today, years_calculated, years_claimed)
    # GỌI GEMINI: bắt AI trả JSON đúng khuôn LLMScoringOutput (mức 0-4 cho 5 tiêu chí, yêu cầu bắt buộc, tóm tắt).
    output, usage = await manager.generate_structured(prompt, LLMScoringOutput)

    # Python tính điểm 0-100 và xếp loại; provenance = thông tin truy vết.
    result = compute_score(output, today, options, years_calculated, years_claimed)
    provenance = ScoringProvenance(
        model=usage.model,
        prompt_version=PROMPT_VERSION,
        scoring_version=SCORING_VERSION,
        extraction_id=extraction_id,
        extraction_prompt_version=extraction_prompt_version,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        estimated_cost_usd=round(usage.estimated_cost_usd, 6),
        latency_ms=int((time.monotonic() - started) * 1000),
        retries=usage.retries,
    )
    return result, provenance
