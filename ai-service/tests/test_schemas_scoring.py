"""
Test khuôn dữ liệu kết quả chấm (Phần 0) — app/schemas/scoring.py.

Không gọi LLM, không cần DB.
"""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.scoring import (
    DIMENSION_LABELS,
    REQUIREMENT_CATEGORY_LABELS,
    REQUIREMENT_STATUS_LABELS,
    TIER_LABELS,
    RequirementCategory,
    RequirementResult,
    RequirementStatus,
    ScoredBy,
    ScoredDimension,
    ScoreResult,
    ScoringDimension as D,
    ScoringProvenance,
    Tier,
)


@pytest.mark.parametrize("enum_cls, labels", [
    (D, DIMENSION_LABELS),
    (Tier, TIER_LABELS),
    (RequirementStatus, REQUIREMENT_STATUS_LABELS),
    (RequirementCategory, REQUIREMENT_CATEGORY_LABELS),
])
def test_every_enum_value_has_label(enum_cls, labels):
    assert set(labels) == set(enum_cls)
    assert all(isinstance(v, str) and v.strip() for v in labels.values())


def test_tier_has_exactly_three_new_values():
    assert {t.value for t in Tier} == {"FIT", "NOT_FIT", "UNCLASSIFIED"}
    assert TIER_LABELS[Tier.FIT] == "Phù hợp"
    assert TIER_LABELS[Tier.NOT_FIT] == "Không phù hợp"
    assert TIER_LABELS[Tier.UNCLASSIFIED] == "Chưa phân loại"


def test_scoring_dimension_keeps_five_old_names():
    assert [d.value for d in D] == [
        "TECHNICAL_SKILLS", "RELEVANT_EXPERIENCE", "SENIORITY", "EDUCATION_CERTIFICATION", "DOMAIN",
    ]


# Ví dụ trong docs (JD Backend Java, ứng viên 2,5 năm): 3, 3, 2, 3, 1 -> 60 điểm -> Chưa phân loại.
def _sample_result() -> ScoreResult:
    levels = {
        D.TECHNICAL_SKILLS: (3, ScoredBy.LLM),
        D.RELEVANT_EXPERIENCE: (3, ScoredBy.LLM),
        D.SENIORITY: (2, ScoredBy.CODE),
        D.EDUCATION_CERTIFICATION: (3, ScoredBy.CODE_AND_LLM),
        D.DOMAIN: (1, ScoredBy.LLM),
    }
    dims = [
        ScoredDimension(
            dimension=d, label=DIMENSION_LABELS[d], applicable=True, level=lv, score=lv / 4 * 100,
            weight=0.2, scored_by=by, evidence=[f"dẫn chứng {d.value}"], reason=f"lý do {d.value}",
        )
        for d, (lv, by) in levels.items()
    ]
    reqs = [
        RequirementResult(requirement="Java", category=RequirementCategory.SKILL, status=RequirementStatus.MET,
                          status_label=REQUIREMENT_STATUS_LABELS[RequirementStatus.MET], checked_by=ScoredBy.LLM,
                          evidence="3 năm phát triển API bằng Java"),
        RequirementResult(requirement="3 năm kinh nghiệm", category=RequirementCategory.EXPERIENCE_YEARS,
                          status=RequirementStatus.UNMET,
                          status_label=REQUIREMENT_STATUS_LABELS[RequirementStatus.UNMET], checked_by=ScoredBy.CODE,
                          evidence="2,5 năm"),
    ]
    return ScoreResult(
        total_score=sum(d.score for d in dims) / len(dims), tier=Tier.UNCLASSIFIED,
        tier_label=TIER_LABELS[Tier.UNCLASSIFIED], tier_reason="60 điểm nằm trong vùng 57,5–67,5",
        dimensions=dims, requirements=reqs, threshold=62.5, uncertainty=5.0,
        summary="Tóm tắt.", comment="Mức độ phù hợp: Chưa phân loại (60/100). Tóm tắt.",
        years_calculated=2.5, years_claimed=None, scored_on=date(2026, 10, 22),
    )


def test_score_result_sample_from_docs_round_trips_json():
    r = _sample_result()
    assert r.total_score == 60
    assert ScoreResult.model_validate_json(r.model_dump_json()) == r
    assert ScoreResult.model_validate(r.model_dump(mode="json")) == r


def test_total_score_none_is_valid():
    r = _sample_result().model_copy(update={"total_score": None, "tier": Tier.UNCLASSIFIED})
    assert ScoreResult.model_validate_json(r.model_dump_json()).total_score is None


@pytest.mark.parametrize("level", [-1, 5])
def test_level_out_of_range_rejected(level):
    with pytest.raises(ValidationError):
        ScoredDimension(dimension=D.DOMAIN, label="x", applicable=True, level=level, score=50,
                        weight=0.2, scored_by=ScoredBy.LLM)


def test_unknown_tier_value_rejected():
    data = _sample_result().model_dump(mode="json")
    data["tier"] = "GOOD_FIT"
    with pytest.raises(ValidationError):
        ScoreResult.model_validate(data)


def test_provenance_has_jd_extraction_fields():
    p = ScoringProvenance(model="gemini", prompt_version="v2.0", scoring_version="v2.0",
                          jd_extraction_id=7, jd_extraction_prompt_version="v1.0")
    assert p.jd_extraction_id == 7 and p.jd_extraction_prompt_version == "v1.0"
    default = ScoringProvenance(model="gemini", prompt_version="v2.0", scoring_version="v2.0")
    assert default.jd_extraction_id is None and default.jd_extraction_prompt_version is None
