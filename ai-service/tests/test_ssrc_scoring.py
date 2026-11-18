"""Điểm 0–100, xếp loại và chính sách chứng chỉ (Python thuần)."""
from datetime import date

import pytest

from app.schemas.ssrc import JDFacts, Rating, Requirement, ScoreFour, Tier
from app.services.scoring_ssrc import Thresholds, build_result, cert_policy_from_jd, classify, total_score

TH = Thresholds(fit=70.0, not_fit=60.0)


def rating(score, reason="Có căn cứ trong CV"):
    return Rating(score=score, reason=reason, cv_evidence=[], jd_evidence=[])


def four(we, sk, ed, ce):
    return ScoreFour(work_experience=rating(we), skills=rating(sk), education=rating(ed),
                     certifications=rating(ce, "N/A: JD không đề cập chứng chỉ") if ce is None else rating(ce))


@pytest.mark.parametrize("scores,expected", [
    ([5, 5, 5, 5], 100.0),
    ([4, 4, 3, 3], 70.0),
    ([3, 3, 3, 3], 60.0),
    ([1, 1, 1, 1], 20.0),
    ([4, 4, 3], 73.3),     # Chứng chỉ N/A: chia 3
    ([3, 3, 4], 66.7),
    ([2, 3, 3], 53.3),
])
def test_total_is_mean_times_20(scores, expected):
    assert total_score(scores) == expected


def test_total_needs_scores():
    with pytest.raises(ValueError):
        total_score([])


@pytest.mark.parametrize("total,tier", [
    (100.0, Tier.FIT), (70.0, Tier.FIT), (69.9, Tier.UNCLASSIFIED), (60.0, Tier.UNCLASSIFIED),
    (59.9, Tier.NOT_FIT), (20.0, Tier.NOT_FIT),
])
def test_thresholds(total, tier):
    got, reason = classify(total, {"work_experience": 3, "skills": 3, "education": 3}, TH)
    assert got == tier and reason


def test_fit_with_a_criterion_of_one_is_demoted():
    tier, reason = classify(72.0, {"work_experience": 1, "skills": 5, "education": 5, "certifications": 5}, TH)
    assert tier == Tier.UNCLASSIFIED
    assert "Kinh nghiệm làm việc" in reason and "1/5" in reason


def test_criterion_of_one_never_promotes():
    # Không đủ 60 thì có tiêu chí = 1 vẫn là Không phù hợp: luật chỉ hạ, không nâng.
    assert classify(50.0, {"work_experience": 1, "skills": 3, "education": 3}, TH)[0] == Tier.NOT_FIT
    assert classify(65.0, {"work_experience": 1, "skills": 5, "education": 4}, TH)[0] == Tier.UNCLASSIFIED


def test_injection_never_auto_fit():
    tier, reason = classify(90.0, {"work_experience": 5, "skills": 5, "education": 5}, TH, injection_detected=True)
    assert tier == Tier.UNCLASSIFIED and "điều khiển AI" in reason
    # Không phải Phù hợp thì cờ chèn lệnh không đổi xếp loại.
    assert classify(40.0, {"skills": 2}, TH, injection_detected=True)[0] == Tier.NOT_FIT


def test_custom_thresholds_from_config():
    strict = Thresholds(fit=80.0, not_fit=50.0)
    assert classify(75.0, {"skills": 4}, strict)[0] == Tier.UNCLASSIFIED
    assert classify(49.0, {"skills": 2}, strict)[0] == Tier.NOT_FIT


def test_build_result_na_certification():
    result = build_result(four(4, 4, 3, None), "NOT_SPECIFIED", TH, scored_on=date(2026, 11, 18))
    assert result.total_score == 73.3 and result.tier == Tier.FIT and result.tier_label == "Phù hợp"
    cert = next(c for c in result.criteria if c.key == "certifications")
    assert cert.score is None and cert.applicable is False and cert.label == "Chứng chỉ"
    assert [c.key for c in result.criteria] == ["work_experience", "skills", "education", "certifications"]
    assert result.scored_on == "2026-11-18" and result.cert_policy == "NOT_SPECIFIED"


def test_build_result_with_certification_and_injection():
    result = build_result(four(5, 5, 5, 5), "REQUIRED", TH, scored_on=date(2026, 11, 18),
                          injection_detected=True, injection_patterns=["ignore previous"])
    assert result.total_score == 100.0 and result.tier == Tier.UNCLASSIFIED
    assert result.injection_detected and result.injection_patterns == ["ignore previous"]


def _req(dimension, priority):
    return Requirement(dimension=dimension, priority=priority, requirement="x yêu cầu", quote="x quote")


def test_cert_policy_derived_from_jd():
    assert cert_policy_from_jd(JDFacts(job_title="a", requirements=[_req("SKILLS", "REQUIRED")])) == "NOT_SPECIFIED"
    assert cert_policy_from_jd(JDFacts(job_title="a", requirements=[
        _req("SKILLS", "REQUIRED"), _req("CERTIFICATIONS", "PREFERRED")])) == "PREFERRED"
    assert cert_policy_from_jd(JDFacts(job_title="a", requirements=[
        _req("CERTIFICATIONS", "PREFERRED"), _req("CERTIFICATIONS", "REQUIRED")])) == "REQUIRED"
    assert cert_policy_from_jd(JDFacts(job_title="a", requirements=[])) == "NOT_SPECIFIED"
