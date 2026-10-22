"""Phần 5: gộp kết quả, điểm tổng, yêu cầu bắt buộc, xếp loại (app/services/scoring/aggregate.py) — không LLM, không DB."""

from datetime import date

import pytest

from app.schemas.jd_extraction import (
    EducationRequirement,
    ExperienceRequirement,
    ExtractedJD,
    Importance,
    RequirementItem,
)
from app.schemas.scoring import (
    RequirementCategory,
    RequirementResult,
    RequirementStatus,
    ScoredBy,
    ScoringDimension as D,
    Tier,
)
from app.schemas.scoring_llm import LLMScoringOutput
from app.services.scoring.aggregate import Thresholds, assemble_result, classify

TODAY = date(2026, 10, 22)
T = Thresholds()
REQ, PREF = Importance.REQUIRED, Importance.PREFERRED
MET, UNMET, UNKNOWN = RequirementStatus.MET, RequirementStatus.UNMET, RequirementStatus.UNKNOWN


def item(name, importance=REQ):
    return RequirementItem(name=name, importance=importance)


def backend_jd(years_importance=REQ, **overrides) -> ExtractedJD:
    """JD Backend Java trong docs (Bước 1)."""
    data = dict(
        job_title="Lập trình viên Backend Java",
        skills=[item("Java"), item("Spring Boot"), item("SQL"), item("Docker", PREF)],
        tasks=["Xây dựng API", "Thiết kế cơ sở dữ liệu", "Sửa lỗi"],
        experience=ExperienceRequirement(min_years=3, importance=years_importance),
        education=EducationRequirement(degree_text="Đại học", fields=["Công nghệ thông tin"], importance=REQ),
        certifications=[],
        domains=[item("Ngân hàng", PREF)],
    )
    data.update(overrides)
    return ExtractedJD(**data)


def llm_output(levels=None, field="EXACT", checks=None, drop=()) -> LLMScoringOutput:
    levels = {"TECHNICAL_SKILLS": 3, "RELEVANT_EXPERIENCE": 3, "DOMAIN": 1, **(levels or {})}
    dims = [{"dimension": d, "applicable": True, "level": lv, "evidence": [f"dẫn chứng {d}"], "reason": f"lý do {d}"}
            for d, lv in levels.items()]
    if checks is None:
        checks = [("Java", "SKILL", "MET"), ("Spring Boot", "SKILL", "MET"), ("SQL", "SKILL", "MET")]
    output = LLMScoringOutput.model_validate({
        "dimensions": dims,
        "education_field": {"match": field, "evidence": "Công nghệ thông tin"},
        "requirement_checks": [{"requirement": n, "category": c, "status": s, "evidence": None} for n, c, s in checks],
        "summary": "Tóm tắt của AI.",
    })
    # Mô phỏng Gemini thiếu tiêu chí (bỏ qua validator "đủ 3 tiêu chí" bằng model_construct)
    if drop:
        output = LLMScoringOutput.model_construct(
            dimensions=[d for d in output.dimensions if d.dimension.value not in drop],
            education_field=output.education_field, requirement_checks=output.requirement_checks, summary=output.summary)
    return output


def assemble(jd, llm, years=2.5, degree=6):
    return assemble_result(jd, llm, years_calculated=years, years_claimed=None,
                           candidate_degree_level=degree, today=TODAY, thresholds=T)


def dim(result, d):
    return next(x for x in result.dimensions if x.dimension == d)


# ============================================================
# Ví dụ trong docs
# ============================================================

def test_docs_example_60_points_but_required_years_unmet_is_not_fit():
    """Docs Bước 5: 3, 3, 2, 3, 1 -> 60 điểm. JD ghi 3 năm là BẮT BUỘC mà ứng viên có 2,5 năm -> yêu cầu Không đạt.
    Theo thứ tự Bước 6: quy tắc 1 không khớp (có điểm, không có UNKNOWN) -> quy tắc 2 khớp (có UNMET) -> Không phù hợp,
    dù 60 điểm nằm trong vùng chưa chắc chắn."""
    r = assemble(backend_jd(), llm_output())
    assert [dim(r, d).level for d in D] == [3, 3, 2, 3, 1]
    assert r.total_score == 60
    years_req = next(q for q in r.requirements if q.category == RequirementCategory.EXPERIENCE_YEARS)
    assert years_req.status == UNMET and years_req.checked_by == ScoredBy.CODE
    assert r.tier == Tier.NOT_FIT and "Tối thiểu 3 năm kinh nghiệm" in r.tier_reason
    assert r.comment.startswith("Gợi ý: Không phù hợp (60/100). Không đạt yêu cầu bắt buộc: Tối thiểu 3 năm kinh nghiệm.")
    assert r.comment.endswith("Tóm tắt của AI.")
    assert r.threshold == 62.5 and r.uncertainty == 5.0 and r.scored_on == TODAY and r.years_calculated == 2.5


def test_docs_example_years_preferred_is_unclassified():
    """Cùng ví dụ nhưng 3 năm chỉ là ƯU TIÊN: không có yêu cầu số năm -> 60 nằm trong 57,5–67,5 -> Chưa phân loại."""
    r = assemble(backend_jd(years_importance=PREF), llm_output())
    assert r.total_score == 60
    assert all(q.category != RequirementCategory.EXPERIENCE_YEARS for q in r.requirements)
    assert r.tier == Tier.UNCLASSIFIED and "57,5–67,5" in r.tier_reason


# ============================================================
# Ranh giới xếp loại
# ============================================================

@pytest.mark.parametrize("score, tier", [
    (57.4, Tier.NOT_FIT), (57.5, Tier.UNCLASSIFIED), (67.4, Tier.UNCLASSIFIED), (67.5, Tier.FIT),
    (0, Tier.NOT_FIT), (100, Tier.FIT),
])
def test_classify_boundaries(score, tier):
    assert classify(score, [], T)[0] == tier


def _req(name, status):
    return RequirementResult(requirement=name, category=RequirementCategory.SKILL, status=status,
                             status_label="x", checked_by=ScoredBy.LLM)


def test_unknown_requirement_unclassified_even_with_high_score():
    tier, reason = classify(95, [_req("Java", MET), _req("Kafka", UNKNOWN)], T)
    assert tier == Tier.UNCLASSIFIED and "Kafka" in reason


def test_unknown_and_unmet_is_unclassified_rule_1_first():
    tier, reason = classify(95, [_req("Kafka", UNKNOWN), _req("Go", UNMET)], T)
    assert tier == Tier.UNCLASSIFIED and "Kafka" in reason and "Go" in reason


def test_unmet_requirement_not_fit_even_with_high_score():
    tier, reason = classify(95, [_req("Go", UNMET)], T)
    assert tier == Tier.NOT_FIT and "Go" in reason


def test_no_score_unclassified():
    assert classify(None, [], T)[0] == Tier.UNCLASSIFIED


def test_custom_thresholds():
    assert classify(60, [], Thresholds(threshold=50, uncertainty=5))[0] == Tier.FIT


# ============================================================
# Tiêu chí áp dụng, điểm tổng, trọng số
# ============================================================

def test_not_applicable_dimension_excluded():
    jd = backend_jd(domains=[], years_importance=PREF)   # JD không nêu lĩnh vực
    r = assemble(jd, llm_output())
    domain = dim(r, D.DOMAIN)
    assert not domain.applicable and domain.score is None and domain.weight == 0
    assert r.total_score == round((75 + 75 + 50 + 75) / 4, 1)


def test_applicability_from_jd_not_from_gemini_flag():
    llm = llm_output()
    llm.dimensions[2].applicable = False               # Gemini nói DOMAIN không áp dụng, nhưng JD có lĩnh vực
    r = assemble(backend_jd(years_importance=PREF), llm)
    assert dim(r, D.DOMAIN).applicable and dim(r, D.DOMAIN).level == 1


def test_level_none_dimension_excluded():
    r = assemble(backend_jd(), llm_output(), years=None)    # CV không có mốc thời gian
    seniority = dim(r, D.SENIORITY)
    assert seniority.applicable and seniority.level is None and seniority.weight == 0
    assert r.total_score == round((75 + 75 + 75 + 25) / 4, 1)
    assert r.tier == Tier.UNCLASSIFIED                       # yêu cầu số năm UNKNOWN


def test_no_dimension_gives_none_and_unclassified():
    r = assemble(ExtractedJD(), llm_output(checks=[]))
    assert r.total_score is None and r.tier == Tier.UNCLASSIFIED
    assert all(not d.applicable and d.weight == 0 for d in r.dimensions)
    assert r.comment.startswith("Gợi ý: Chưa phân loại (chưa tính được điểm).")


def test_weights_equal_and_sum_to_one():
    r = assemble(backend_jd(), llm_output())
    counted = [d for d in r.dimensions if d.score is not None]
    assert len({d.weight for d in counted}) == 1
    assert sum(d.weight for d in r.dimensions) == pytest.approx(1.0)


def test_scored_by():
    r = assemble(backend_jd(), llm_output())
    assert dim(r, D.TECHNICAL_SKILLS).scored_by == ScoredBy.LLM
    assert dim(r, D.SENIORITY).scored_by == ScoredBy.CODE
    assert dim(r, D.EDUCATION_CERTIFICATION).scored_by == ScoredBy.CODE_AND_LLM


# ============================================================
# Gemini trả thiếu / lạ
# ============================================================

def test_gemini_missing_dimension():
    r = assemble(backend_jd(years_importance=PREF), llm_output(drop=("DOMAIN",)))
    domain = dim(r, D.DOMAIN)
    assert domain.applicable and domain.level is None and "AI không trả kết quả" in domain.reason
    assert r.total_score == round((75 + 75 + 50 + 75) / 4, 1)


def test_gemini_missing_check_is_unknown():
    r = assemble(backend_jd(years_importance=PREF),
                 llm_output(checks=[("Java", "SKILL", "MET"), ("spring boot", "SKILL", "MET")]))
    sql = next(q for q in r.requirements if q.requirement == "SQL")
    assert sql.status == UNKNOWN and sql.evidence == "AI không kiểm tra yêu cầu này"
    spring = next(q for q in r.requirements if q.requirement == "Spring Boot")
    assert spring.status == MET                                # khớp tên không phân biệt hoa thường
    assert r.tier == Tier.UNCLASSIFIED


def test_gemini_extra_check_ignored():
    checks = [("Java", "SKILL", "MET"), ("Spring Boot", "SKILL", "MET"), ("SQL", "SKILL", "MET"),
              ("Kubernetes", "SKILL", "UNMET")]
    r = assemble(backend_jd(years_importance=PREF), llm_output(checks=checks))
    assert "Kubernetes" not in [q.requirement for q in r.requirements]


@pytest.mark.parametrize("min_years, has_years_requirement", [(0, False), (2, True)])
def test_years_requirement_only_when_jd_requires_more_than_zero(min_years, has_years_requirement):
    jd = backend_jd(experience=ExperienceRequirement(min_years=min_years, importance=REQ))
    r = assemble(jd, llm_output(), years=0.0)
    years_reqs = [q for q in r.requirements if q.category == RequirementCategory.EXPERIENCE_YEARS]
    assert bool(years_reqs) == has_years_requirement
    assert dim(r, D.SENIORITY).applicable                 # tiêu chí Số năm vẫn chấm
    if has_years_requirement:
        assert years_reqs[0].requirement == "Tối thiểu 2 năm kinh nghiệm" and years_reqs[0].status == UNMET


def test_preferred_items_not_in_requirements():
    r = assemble(backend_jd(years_importance=PREF), llm_output())
    names = [q.requirement for q in r.requirements]
    assert "Docker" not in names and "Ngân hàng" not in names


# ============================================================
# Học vấn và chứng chỉ
# ============================================================

def test_education_requirement_uses_min_degree_level():
    jd = backend_jd(years_importance=PREF,
                    education=EducationRequirement(degree_text="Đại học hoặc Cao đẳng", importance=REQ))
    r = assemble(jd, llm_output(), degree=5)
    edu_req = next(q for q in r.requirements if q.category == RequirementCategory.EDUCATION_LEVEL)
    assert edu_req.status == MET and "Cao đẳng (bậc 5)" in edu_req.requirement
    assert dim(r, D.EDUCATION_CERTIFICATION).level == 3


def test_unrecognized_degree_text_no_requirement_and_noted():
    jd = backend_jd(years_importance=PREF, education=EducationRequirement(degree_text="Bằng cấp phù hợp", importance=REQ))
    r = assemble(jd, llm_output())
    assert all(q.category != RequirementCategory.EDUCATION_LEVEL for q in r.requirements)
    assert "Không nhận ra bậc học JD yêu cầu" in dim(r, D.EDUCATION_CERTIFICATION).reason


def test_degree_note_added_to_evidence():
    r = assemble_result(backend_jd(years_importance=PREF), llm_output(), years_calculated=2.5, years_claimed=None,
                        candidate_degree_level=6, today=TODAY, thresholds=T,
                        degree_note="suy từ tên trường: Đại học Bách Khoa TP.HCM")
    edu_req = next(q for q in r.requirements if q.category == RequirementCategory.EDUCATION_LEVEL)
    assert edu_req.status == MET and "suy từ tên trường: Đại học Bách Khoa TP.HCM" in edu_req.evidence
    assert "suy từ tên trường" in dim(r, D.EDUCATION_CERTIFICATION).evidence[0]
    plain = assemble(backend_jd(years_importance=PREF), llm_output())
    assert "suy từ tên trường" not in dim(plain, D.EDUCATION_CERTIFICATION).evidence[0]


def test_candidate_degree_unknown():
    r = assemble(backend_jd(years_importance=PREF), llm_output(), degree=None)
    assert dim(r, D.EDUCATION_CERTIFICATION).level is None
    edu_req = next(q for q in r.requirements if q.category == RequirementCategory.EDUCATION_LEVEL)
    assert edu_req.status == UNKNOWN and r.tier == Tier.UNCLASSIFIED


def test_required_cert_unmet_lowers_education_and_not_fit():
    jd = backend_jd(years_importance=PREF, certifications=[item("AWS")])
    checks = [("Java", "SKILL", "MET"), ("Spring Boot", "SKILL", "MET"), ("SQL", "SKILL", "MET"),
              ("AWS", "CERTIFICATION", "UNMET")]
    r = assemble(jd, llm_output(checks=checks))
    assert dim(r, D.EDUCATION_CERTIFICATION).level == 2
    assert r.tier == Tier.NOT_FIT and "AWS" in r.tier_reason


def test_preferred_cert_met_raises_education_to_4():
    jd = backend_jd(years_importance=PREF, certifications=[item("AWS", PREF)])
    checks = [("Java", "SKILL", "MET"), ("Spring Boot", "SKILL", "MET"), ("SQL", "SKILL", "MET"),
              ("AWS", "CERTIFICATION", "MET")]
    r = assemble(jd, llm_output(checks=checks))
    assert dim(r, D.EDUCATION_CERTIFICATION).level == 4
    assert "AWS" not in [q.requirement for q in r.requirements]   # ưu tiên không phải yêu cầu bắt buộc


def test_certifications_only_makes_education_applicable():
    jd = backend_jd(years_importance=PREF, education=None, certifications=[item("ISTQB", PREF)])
    r = assemble(jd, llm_output())
    assert dim(r, D.EDUCATION_CERTIFICATION).applicable


def test_full_fit_example():
    r = assemble(backend_jd(), llm_output(levels={"TECHNICAL_SKILLS": 4, "DOMAIN": 3}), years=5.0, degree=6)
    assert r.total_score == round((100 + 75 + 75 + 75 + 75) / 5, 1)
    assert r.tier == Tier.FIT and all(q.status == MET for q in r.requirements)
