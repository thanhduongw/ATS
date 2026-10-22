"""
Gộp kết quả chấm — Bước 4, 5, 6 trong docs/DE_XUAT_CHAM_DIEM_CV.md.

- Gộp mức 0–4 của 5 tiêu chí: 3 tiêu chí do Gemini chấm (LLMScoringOutput) + Số năm và Học vấn do code chấm (rules.py).
- Danh sách yêu cầu bắt buộc với trạng thái Đạt / Không đạt / Không xác định được (Bước 4).
- Điểm tổng = trung bình các tiêu chí, trọng số bằng nhau (Bước 5).
- Xếp loại Phù hợp / Không phù hợp / Chưa phân loại theo ngưỡng T và vùng không chắc chắn δ (Bước 6).

Python thuần, tất định: không gọi LLM, không DB. Benchmark dùng lại để tính lại điểm khi đổi T, δ mà không gọi lại Gemini.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from typing import Any

from app.schemas.jd_extraction import ExtractedJD, Importance, RequirementItem
from app.schemas.scoring import (
    DIMENSION_LABELS,
    REQUIREMENT_STATUS_LABELS,
    TIER_LABELS,
    RequirementCategory,
    RequirementResult,
    RequirementStatus,
    ScoredBy,
    ScoredDimension,
    ScoreResult,
    ScoringDimension,
    Tier,
)
from app.schemas.scoring_llm import FieldMatch, LLMScoringOutput, RequirementCheck
from app.services.scoring import rules

D = ScoringDimension

logger = logging.getLogger(__name__)


# [GIẢI THÍCH] Ngưỡng xếp loại (Bước 6): T = 62,5 (giữa mức 2 và mức 3), vùng không chắc chắn ± δ = 5.
# Giá trị khởi đầu là QUY ƯỚC của nhóm; hiệu chỉnh lại trên tập hiệu chỉnh (không dùng tập kiểm tra).
# Giá trị thật đọc từ cấu hình (SCORING_THRESHOLD, SCORING_UNCERTAINTY) qua scoring_options().
@dataclass(frozen=True)
class Thresholds:
    threshold: float = 62.5
    uncertainty: float = 5.0


# [GIẢI THÍCH] Ai chấm từng tiêu chí ("Nguyên tắc chung"): code làm việc có quy tắc rõ ràng, LLM làm việc cần đọc hiểu.
_SCORED_BY: dict[ScoringDimension, ScoredBy] = {
    D.TECHNICAL_SKILLS: ScoredBy.LLM,
    D.RELEVANT_EXPERIENCE: ScoredBy.LLM,
    D.SENIORITY: ScoredBy.CODE,
    D.EDUCATION_CERTIFICATION: ScoredBy.CODE_AND_LLM,
    D.DOMAIN: ScoredBy.LLM,
}

# Loại yêu cầu code được phép kiểm tra lại bằng so khớp chữ (tên riêng); DOMAIN cần đọc hiểu nên để AI.
_NAMED_CATEGORIES = {RequirementCategory.SKILL, RequirementCategory.CERTIFICATION}

_NOT_APPLICABLE_REASON = "JD không nêu yêu cầu cho tiêu chí này nên không tính vào điểm."
_LLM_MISSING_REASON = "AI không trả kết quả cho tiêu chí này"
_CHECK_MISSING_EVIDENCE = "AI không kiểm tra yêu cầu này"


def _vn(number: float) -> str:
    """57.5 -> "57,5"; 60.0 -> "60" (dấu phẩy thập phân kiểu Việt Nam)."""
    return f"{round(number, 1):g}".replace(".", ",")


def _key(name: str) -> str:
    return name.strip().casefold()


# ============================================================
# Bước 2–3: tiêu chí nào áp dụng, mức từng tiêu chí
# ============================================================

# [GIẢI THÍCH] Tiêu chí nào áp dụng — quyết định TỪ danh sách yêu cầu JD (tất định), không dùng cờ applicable của Gemini,
# để cùng một JD thì mọi CV được tính trên cùng một tập tiêu chí (Bước 5: "tiêu chí nào JD không nhắc tới thì bỏ").
def applicable_dimensions(jd: ExtractedJD) -> set[ScoringDimension]:
    dims: set[ScoringDimension] = set()
    if jd.skills:
        dims.add(D.TECHNICAL_SKILLS)
    if jd.tasks or (jd.job_title and jd.job_title.strip()):
        dims.add(D.RELEVANT_EXPERIENCE)
    if jd.experience is not None and jd.experience.min_years is not None:
        dims.add(D.SENIORITY)
    if (jd.education is not None and (jd.education.degree_text or jd.education.fields)) or jd.certifications:
        dims.add(D.EDUCATION_CERTIFICATION)
    if jd.domains:
        dims.add(D.DOMAIN)
    return dims


# [GIẢI THÍCH] Tra kết quả kiểm tra của Gemini theo tên yêu cầu (không phân biệt hoa thường); trùng tên thì lấy bản đầu.
def _checks_by_name(llm: LLMScoringOutput) -> dict[str, RequirementCheck]:
    out: dict[str, RequirementCheck] = {}
    for check in llm.requirement_checks:
        out.setdefault(_key(check.requirement), check)
    return out


# [GIẢI THÍCH] Trạng thái chứng chỉ cho tiêu chí Học vấn (bảng Học vấn ở Bước 3):
# - required_certs_met: mọi chứng chỉ BẮT BUỘC đều Đạt -> True; có Không đạt -> False; còn lại (thiếu kết quả,
#   Không xác định được) -> None; JD không có chứng chỉ bắt buộc -> True.
# - preferred_cert_met: có ít nhất một chứng chỉ ƯU TIÊN Đạt (điều kiện lên mức 4).
def _cert_status(jd: ExtractedJD, checks: dict[str, RequirementCheck]) -> tuple[bool | None, bool]:
    required = [c for c in jd.certifications if c.importance == Importance.REQUIRED]
    statuses = [checks[_key(c.name)].status if _key(c.name) in checks else None for c in required]
    if RequirementStatus.UNMET in statuses:
        required_met: bool | None = False
    elif all(s == RequirementStatus.MET for s in statuses):
        required_met = True
    else:
        required_met = None
    preferred_met = any(
        _key(c.name) in checks and checks[_key(c.name)].status == RequirementStatus.MET
        for c in jd.certifications if c.importance == Importance.PREFERRED
    )
    return required_met, preferred_met


def _dimension(dim: ScoringDimension, applicable: bool, level: int | None,
               evidence: list[str], reason: str) -> ScoredDimension:
    return ScoredDimension(
        dimension=dim, label=DIMENSION_LABELS[dim], applicable=applicable,
        level=level if applicable else None,
        score=round(level / 4 * 100, 1) if applicable and level is not None else None,
        weight=0.0, scored_by=_SCORED_BY[dim], evidence=evidence if applicable else [], reason=reason,
    )


# [GIẢI THÍCH] Mức của 5 tiêu chí (Bước 3):
# - Kỹ năng, Kinh nghiệm liên quan, Lĩnh vực: lấy mức Gemini chấm theo bảng mức riêng; Gemini thiếu tiêu chí -> mức None.
# - Số năm: rules.seniority_outcome (11 khoảng O*NET).
# - Học vấn và chứng chỉ: rules.education_outcome (bậc Khung trình độ quốc gia + ngành do Gemini xét + chứng chỉ).
def _score_dimensions(
    jd: ExtractedJD,
    llm: LLMScoringOutput,
    checks: dict[str, RequirementCheck],
    years_calculated: float | None,
    candidate_degree_level: int | None,
    degree_note: str | None = None,
    studying: str | None = None,
    profile: dict[str, Any] | None = None,
) -> list[ScoredDimension]:
    applicable = applicable_dimensions(jd)
    assessments = {}
    for a in llm.dimensions:
        assessments.setdefault(a.dimension.value, a)

    out: list[ScoredDimension] = []
    for dim in ScoringDimension:
        if dim not in applicable:
            out.append(_dimension(dim, False, None, [], _NOT_APPLICABLE_REASON))
        elif dim == D.SENIORITY:
            outcome = rules.seniority_outcome(years_calculated, jd.experience.min_years)
            out.append(_dimension(dim, True, outcome.level, [outcome.evidence], outcome.reason))
        elif dim == D.EDUCATION_CERTIFICATION:
            out.append(_education_dimension(jd, llm, checks, candidate_degree_level, degree_note, studying, profile))
        else:
            a = assessments.get(dim.value)
            if a is None:
                out.append(_dimension(dim, True, None, [], _LLM_MISSING_REASON))
            else:
                out.append(_dimension(dim, True, a.level, list(a.evidence), a.reason))
    return out


def _education_dimension(
    jd: ExtractedJD,
    llm: LLMScoringOutput,
    checks: dict[str, RequirementCheck],
    candidate_degree_level: int | None,
    degree_note: str | None = None,
    studying: str | None = None,
    profile: dict[str, Any] | None = None,
) -> ScoredDimension:
    degree_text = jd.education.degree_text if jd.education else None
    required_level = rules.min_degree_level(degree_text)
    required_certs_met, preferred_cert_met = _cert_status(jd, checks)
    jd_fields = list(jd.education.fields) if jd.education else []
    field_match, field_note = _field_match(llm.education_field.match, jd_fields, profile)

    # [GIẢI THÍCH] Đang học (chưa có bậc nào hoàn thành) mà JD đòi một bậc -> mức 1, cùng mức với "thấp hơn 1 bậc":
    # chưa có văn bằng JD yêu cầu. Đây là thông tin đã đủ, không phải "không xác định được".
    if candidate_degree_level is None and studying and required_level is not None:
        label = rules.DEGREE_LEVEL_LABELS.get(required_level, "Bậc")
        evidence = f"{studying}; JD yêu cầu: {label} (bậc {required_level})"
        return _dimension(D.EDUCATION_CERTIFICATION, True, 1, [evidence], "Đang học, chưa có văn bằng JD yêu cầu.")

    outcome = rules.education_outcome(
        candidate_degree_level,
        required_level,
        field_match,
        fields_restricted=bool(jd_fields),
        required_certs_met=required_certs_met,
        preferred_cert_met=preferred_cert_met,
    )
    reason = outcome.reason
    if degree_text and required_level is None:
        reason += f" Không nhận ra bậc học JD yêu cầu (\"{degree_text}\") nên không so bậc."
    # Bậc học suy từ tên trường / ngành được code nâng thành đúng ngành -> ghi rõ trong dẫn chứng để HR biết.
    notes = [n for n in (degree_note, field_note) if n]
    evidence = f"{outcome.evidence} ({'; '.join(notes)})" if notes else outcome.evidence
    return _dimension(D.EDUCATION_CERTIFICATION, True, outcome.level, [evidence], reason)


# [GIẢI THÍCH] Ngành học: AI trả RELATED / UNRELATED / UNKNOWN mà ngành trong CV và một ngành JD chấp nhận cùng thuộc
# nhóm 748 "Máy tính và công nghệ thông tin" (Thông tư 09/2022/TT-BGDĐT) -> code nâng thành EXACT.
# Chỉ nâng, không hạ: AI đã trả EXACT thì giữ nguyên. Trả (độ phù hợp, ghi chú cho dẫn chứng).
def _field_match(
    ai_match: FieldMatch, jd_fields: list[str], profile: dict[str, Any] | None,
) -> tuple[FieldMatch, str | None]:
    if ai_match == FieldMatch.EXACT or not jd_fields or not profile:
        return ai_match, None
    for entry in profile.get("education") or []:
        cv_field = entry.get("field_of_study")
        if rules.same_field_group(cv_field, jd_fields):
            logger.info("education field '%s' %s->EXACT by field group 748", cv_field, ai_match.value)
            return FieldMatch.EXACT, f"ngành {cv_field} cùng nhóm ngành 748 Máy tính và CNTT (TT 09/2022/TT-BGDĐT)"
    return ai_match, None


# ============================================================
# Bước 5: điểm tổng, trọng số bằng nhau
# ============================================================

# [GIẢI THÍCH] ĐIỂM TỔNG = (1/k) × Σ (mức_i / 4 × 100), k = số tiêu chí áp dụng VÀ có mức (Bước 5).
# Trọng số bằng nhau theo Dawes (1979): trên dữ liệu mới, trọng số bằng nhau tốt ngang hoặc hơn trọng số "tối ưu".
# Tiêu chí có mức None (CV thiếu thông tin, AI không trả) bị loại khỏi trung bình; trạng thái "Không xác định được"
# của yêu cầu bắt buộc tương ứng sẽ đưa hồ sơ về Chưa phân loại (Bước 6), nên không bị "lợi" vì thiếu thông tin.
# Ghi lại weight = 1/k vào từng tiêu chí để HR thấy cách tính. Không tiêu chí nào chấm được -> None.
def _total_score(dimensions: list[ScoredDimension]) -> float | None:
    counted = [d for d in dimensions if d.applicable and d.score is not None]
    if not counted:
        return None
    for d in counted:
        d.weight = 1 / len(counted)
    return round(sum(d.score for d in counted) / len(counted), 1)


# ============================================================
# Bước 4: danh sách yêu cầu bắt buộc
# ============================================================

def _requirement(name: str, category: RequirementCategory, status: RequirementStatus,
                 checked_by: ScoredBy, evidence: str | None) -> RequirementResult:
    return RequirementResult(requirement=name, category=category, status=status,
                             status_label=REQUIREMENT_STATUS_LABELS[status], checked_by=checked_by, evidence=evidence)


# [GIẢI THÍCH] DANH SÁCH YÊU CẦU BẮT BUỘC (Bước 4 — mô hình sàng lọc nhiều vòng / multiple hurdle, Ock & Oswald, 2018):
# chỉ các yêu cầu JD ghi là BẮT BUỘC; yêu cầu ưu tiên không phải "cửa".
# - Số năm, bậc học: code kiểm tra (rules.check_*). Số năm chỉ thành yêu cầu khi JD đòi > 0 năm.
# - Kỹ năng, chứng chỉ, lĩnh vực: lấy kết quả Gemini theo tên; Gemini không trả -> Không xác định được.
#   Kết quả Gemini có tên không thuộc JD thì bỏ qua (không để AI tự thêm yêu cầu).
def build_requirements(
    jd: ExtractedJD,
    checks: dict[str, RequirementCheck],
    years_calculated: float | None,
    candidate_degree_level: int | None,
    degree_note: str | None = None,
    profile: dict[str, Any] | None = None,
    studying: str | None = None,
) -> list[RequirementResult]:
    """`profile`: hồ sơ chấm mù (build_scoring_profile) — để code kiểm tra lại công cụ / chứng chỉ có tên."""
    out: list[RequirementResult] = []

    # Yêu cầu số năm chỉ tạo khi JD đòi > 0 năm: JD ghi 0 năm (vd Fresher) thì không có gì để kiểm tra.
    # Tiêu chí Số năm kinh nghiệm (Bước 3) vẫn chấm như cũ.
    exp = jd.experience
    if exp is not None and exp.importance == Importance.REQUIRED and exp.min_years is not None and exp.min_years > 0:
        status = rules.check_years_requirement(years_calculated, exp.min_years)
        evidence = (f"Ứng viên: {_vn(years_calculated)} năm" if years_calculated is not None
                    else "Không tính được số năm kinh nghiệm từ CV")
        out.append(_requirement(f"Tối thiểu {_vn(exp.min_years)} năm kinh nghiệm", RequirementCategory.EXPERIENCE_YEARS,
                                status, ScoredBy.CODE, evidence))

    edu = jd.education
    required_level = rules.min_degree_level(edu.degree_text) if edu is not None else None
    if edu is not None and edu.importance == Importance.REQUIRED and required_level is not None:
        status = rules.check_education_requirement(candidate_degree_level, required_level)
        evidence = (f"Ứng viên: {rules.DEGREE_LEVEL_LABELS.get(candidate_degree_level, 'Bậc')} (bậc {candidate_degree_level})"
                    if candidate_degree_level is not None else "CV không ghi rõ văn bằng")
        # [GIẢI THÍCH] Không có bậc nào đã hoàn thành nhưng có mục ĐANG HỌC -> Không đạt (thông tin đã đủ: chưa tốt nghiệp,
        # JD đòi đã tốt nghiệp), không phải Không xác định được. CV không có mục học vấn nào thì giữ như cũ.
        if candidate_degree_level is None and studying:
            status, evidence = RequirementStatus.UNMET, studying
        if degree_note and candidate_degree_level is not None:
            evidence += f" ({degree_note})"
        label = rules.DEGREE_LEVEL_LABELS.get(required_level, "Bậc")
        out.append(_requirement(f"Bậc học tối thiểu: {label} (bậc {required_level})", RequirementCategory.EDUCATION_LEVEL,
                                status, ScoredBy.CODE, evidence))

    seen: set[str] = set()
    groups: list[tuple[list[RequirementItem], RequirementCategory]] = [
        (jd.skills, RequirementCategory.SKILL),
        (jd.certifications, RequirementCategory.CERTIFICATION),
        (jd.domains, RequirementCategory.DOMAIN),
    ]
    for items, category in groups:
        for item in items:
            key = _key(item.name)
            if item.importance != Importance.REQUIRED or not key or key in seen:
                continue
            seen.add(key)
            check = checks.get(key)
            if check is None:
                status, checked_by, evidence = RequirementStatus.UNKNOWN, ScoredBy.LLM, _CHECK_MISSING_EVIDENCE
            else:
                status, checked_by, evidence = check.status, ScoredBy.LLM, check.evidence
            # [GIẢI THÍCH] Công cụ / chứng chỉ CÓ TÊN: hồ sơ ghi nguyên văn thì code tính Đạt, kể cả khi AI chấm Không đạt
            # hoặc không xác định — việc này kiểm tra được bằng chữ nên kết quả lặp lại được (docs Bước 4).
            # CHỈ nâng lên Đạt, không bao giờ hạ Đạt của AI. Không áp dụng cho lĩnh vực (cần đọc hiểu, để AI).
            if (category in _NAMED_CATEGORIES and status != RequirementStatus.MET and profile
                    and (found := rules.find_named_item(item.name, profile))):
                logger.info("requirement '%s' %s->MET by exact match", item.name, status.value)
                status, checked_by, evidence = RequirementStatus.MET, ScoredBy.CODE_AND_LLM, f"Hồ sơ ghi: {found}"
            out.append(_requirement(item.name, category, status, checked_by, evidence))
    return out


# ============================================================
# Bước 6: xếp loại
# ============================================================

def _names(requirements: list[RequirementResult], status: RequirementStatus) -> list[str]:
    return [r.requirement for r in requirements if r.status == status]


# [GIẢI THÍCH] XẾP LOẠI (Bước 6), xét theo thứ tự, gặp điều kiện nào trước thì dừng:
#   1. Chưa phân loại: không tính được điểm; hoặc có yêu cầu bắt buộc "Không xác định được".
#   2. Không phù hợp: có yêu cầu bắt buộc "Không đạt"; hoặc điểm < T − δ.
#   3. Chưa phân loại: T − δ ≤ điểm < T + δ (vùng không chắc chắn).
#   4. Phù hợp: đạt mọi yêu cầu bắt buộc và điểm ≥ T + δ.
# Cơ sở: tùy chọn từ chối phân loại (Chow, 1970) — trường hợp không chắc chắn để HR xử lý thủ công;
# AI chỉ GỢI Ý, không tự loại hay tự duyệt CV. Quy tắc 1 đứng trước quy tắc 2: thiếu thông tin thì không kết luận,
# kể cả khi đã có yêu cầu "Không đạt" (HR vẫn thấy cả hai trong lý do).
def classify(
    total_score: float | None,
    requirements: list[RequirementResult],
    thresholds: Thresholds,
) -> tuple[Tier, str]:
    low = thresholds.threshold - thresholds.uncertainty
    high = thresholds.threshold + thresholds.uncertainty
    unknown = _names(requirements, RequirementStatus.UNKNOWN)
    unmet = _names(requirements, RequirementStatus.UNMET)

    if total_score is None:
        return Tier.UNCLASSIFIED, "Không tính được điểm vì không có tiêu chí nào chấm được; HR cần xem trực tiếp hồ sơ."
    if unknown:
        reason = f"Chưa xác định được yêu cầu bắt buộc: {', '.join(unknown)}"
        if unmet:
            reason += f"; không đạt: {', '.join(unmet)}"
        return Tier.UNCLASSIFIED, reason + ". HR cần xem trực tiếp hồ sơ."
    if unmet:
        return Tier.NOT_FIT, f"Không đạt yêu cầu bắt buộc: {', '.join(unmet)}."
    if total_score < low:
        return Tier.NOT_FIT, f"Điểm {_vn(total_score)} thấp hơn {_vn(low)}."
    if total_score < high:
        return Tier.UNCLASSIFIED, (f"Điểm {_vn(total_score)} nằm trong vùng chưa chắc chắn {_vn(low)}–{_vn(high)}; "
                                   "HR cần xem trực tiếp hồ sơ.")
    return Tier.FIT, f"Đạt mọi yêu cầu bắt buộc và điểm {_vn(total_score)} từ {_vn(high)} trở lên."


# [GIẢI THÍCH] Câu mở đầu nhận xét do CODE viết (luôn khớp điểm và xếp loại), nối với tóm tắt của Gemini.
def headline(total_score: float | None, tier: Tier, tier_reason: str) -> str:
    score = f"{_vn(total_score)}/100" if total_score is not None else "chưa tính được điểm"
    reason = tier_reason if tier_reason.endswith(".") else tier_reason + "."
    return f"Gợi ý: {TIER_LABELS[tier]} ({score}). {reason}"


# ============================================================
# Ghép kết quả cuối
# ============================================================

# [GIẢI THÍCH] GHÉP KẾT QUẢ CUỐI (lưu vào ai_scores.result): 5 tiêu chí -> điểm tổng -> yêu cầu bắt buộc -> xếp loại -> nhận xét.
def assemble_result(
    jd: ExtractedJD,
    llm: LLMScoringOutput,
    *,
    years_calculated: float | None,
    years_claimed: float | None,
    candidate_degree_level: int | None,
    today: date,
    thresholds: Thresholds,
    degree_note: str | None = None,
    profile: dict[str, Any] | None = None,
    studying: str | None = None,
) -> ScoreResult:
    """`degree_note`: ghi chú khi bậc học của ứng viên được suy từ tên trường (rules.candidate_degree_level).
    `profile`: hồ sơ chấm mù — để code kiểm tra lại công cụ / chứng chỉ có tên và nhóm ngành.
    `studying`: mô tả mục học vấn đang học (rules.studying_text) khi ứng viên chưa có bậc nào hoàn thành."""
    checks = _checks_by_name(llm)
    dimensions = _score_dimensions(jd, llm, checks, years_calculated, candidate_degree_level, degree_note,
                                   studying, profile)
    total = _total_score(dimensions)
    requirements = build_requirements(jd, checks, years_calculated, candidate_degree_level, degree_note, profile,
                                      studying)
    tier, tier_reason = classify(total, requirements, thresholds)
    summary = llm.summary.strip()
    return ScoreResult(
        total_score=total,
        tier=tier,
        tier_label=TIER_LABELS[tier],
        tier_reason=tier_reason,
        dimensions=dimensions,
        requirements=requirements,
        threshold=thresholds.threshold,
        uncertainty=thresholds.uncertainty,
        summary=summary,
        comment=f"{headline(total, tier, tier_reason)} {summary}".strip(),
        years_calculated=years_calculated,
        years_claimed=years_claimed,
        scored_on=today,
    )
