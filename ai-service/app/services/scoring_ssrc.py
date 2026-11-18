"""Quy điểm 1–5 của AI thành điểm 0–100 và xếp loại (Python thuần, không gọi AI, không đụng DB).

Quy tắc đã chốt (docs/KE_HOACH_AI_THEO_RESEARCH.md, mục 0):
- Điểm tổng = trung bình các tiêu chí CÓ điểm × 20, trọng số bằng nhau. Chứng chỉ N/A (null) thì chia cho 3.
- Phù hợp nếu điểm >= ngưỡng Phù hợp (70); Chưa phân loại nếu từ ngưỡng Không phù hợp (60) đến dưới 70;
  Không phù hợp nếu dưới 60. Ngưỡng nằm trong cấu hình (SCORING_FIT_THRESHOLD, SCORING_NOT_FIT_THRESHOLD).
- Đủ điểm Phù hợp nhưng có tiêu chí = 1 → hạ về Chưa phân loại (chỉ hạ, không bao giờ nâng).
- CV nghi chèn lệnh → không tự xếp Phù hợp (hạ về Chưa phân loại).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.schemas.ssrc import (
    CRITERION_LABELS,
    TIER_LABELS,
    CertPolicy,
    CriterionResult,
    JDFacts,
    ScoreFour,
    ScoreResult,
    Tier,
)

CRITERION_KEYS = ("work_experience", "skills", "education", "certifications")


@dataclass(frozen=True)
class Thresholds:
    fit: float = 70.0
    not_fit: float = 60.0


def cert_policy_from_jd(jd: JDFacts) -> CertPolicy:
    """Chính sách chứng chỉ do code suy từ JD đã trích xuất: có yêu cầu CERTIFICATIONS bắt buộc → REQUIRED;
    chỉ có ưu tiên → PREFERRED; không có → NOT_SPECIFIED."""
    certs = [r for r in jd.requirements if r.dimension == "CERTIFICATIONS"]
    if any(r.priority == "REQUIRED" for r in certs):
        return "REQUIRED"
    if certs:
        return "PREFERRED"
    return "NOT_SPECIFIED"


def total_score(scores: list[int]) -> float:
    """Trung bình × 20, làm tròn 1 chữ số thập phân (làm tròn lên ở .5 để không phụ thuộc sai số số thực)."""
    if not scores:
        raise ValueError("Không có tiêu chí nào có điểm")
    value = Decimal(sum(scores) * 20) / Decimal(len(scores))
    return float(value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def _fmt(x: float) -> str:
    return f"{x:g}".replace(".", ",")


def classify(total: float, scores: dict[str, int], thresholds: Thresholds, *,
             injection_detected: bool = False) -> tuple[Tier, str]:
    """Trả (xếp loại, lý do tiếng Việt nêu luật đã áp dụng)."""
    if total >= thresholds.fit:
        low = [k for k in CRITERION_KEYS if scores.get(k) == 1]
        if low:
            names = ", ".join(CRITERION_LABELS[k] for k in low)
            return Tier.UNCLASSIFIED, (
                f"Điểm {_fmt(total)} đạt ngưỡng Phù hợp ({_fmt(thresholds.fit)}) nhưng tiêu chí {names} chỉ được 1/5 "
                f"(không đáp ứng nghiêm trọng) nên hạ về Chưa phân loại để HR xem lại.")
        if injection_detected:
            return Tier.UNCLASSIFIED, (
                f"Điểm {_fmt(total)} đạt ngưỡng Phù hợp ({_fmt(thresholds.fit)}) nhưng CV có nội dung bất thường nhằm "
                f"điều khiển AI nên không tự xếp Phù hợp; HR cần xem trực tiếp hồ sơ.")
        return Tier.FIT, f"Điểm {_fmt(total)} đạt từ ngưỡng Phù hợp ({_fmt(thresholds.fit)}) trở lên."
    if total >= thresholds.not_fit:
        return Tier.UNCLASSIFIED, (
            f"Điểm {_fmt(total)} nằm từ {_fmt(thresholds.not_fit)} đến dưới {_fmt(thresholds.fit)}: "
            f"chưa đủ cơ sở để xếp Phù hợp hay Không phù hợp.")
    return Tier.NOT_FIT, f"Điểm {_fmt(total)} dưới ngưỡng {_fmt(thresholds.not_fit)}."


def build_result(
    out: ScoreFour,
    policy: CertPolicy,
    thresholds: Thresholds,
    *,
    scored_on: date,
    injection_detected: bool = False,
    injection_patterns: list[str] | None = None,
) -> ScoreResult:
    """Ghép kết quả của AI với điểm tổng và xếp loại do code tính."""
    criteria: list[CriterionResult] = []
    scores: dict[str, int] = {}
    for key in CRITERION_KEYS:
        r = getattr(out, key)
        applicable = r.score is not None
        if applicable:
            scores[key] = r.score
        criteria.append(CriterionResult(
            key=key, label=CRITERION_LABELS[key], score=r.score, applicable=applicable,
            reason=r.reason, cv_evidence=list(r.cv_evidence), jd_evidence=list(r.jd_evidence)))
    total = total_score(list(scores.values()))
    tier, reason = classify(total, scores, thresholds, injection_detected=injection_detected)
    return ScoreResult(
        total_score=total, tier=tier, tier_label=TIER_LABELS[tier], tier_reason=reason, cert_policy=policy,
        criteria=criteria, injection_detected=injection_detected,
        injection_patterns=list(injection_patterns or []), scored_on=scored_on.isoformat())
