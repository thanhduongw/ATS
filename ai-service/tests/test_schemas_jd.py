"""
Test khuôn JD sau trích xuất (app/schemas/jd_extraction.py) và đầu ra Gemini khi chấm
(app/schemas/scoring_llm.py) — Phần 0.

Không gọi LLM, không cần DB.
"""

import json

import pytest
from pydantic import BaseModel, ValidationError

from app.schemas.jd_extraction import (
    IMPORTANCE_LABELS,
    ExperienceRequirement,
    ExtractedJD,
    Importance,
)
from app.schemas.scoring import RequirementCategory, RequirementStatus, ScoringDimension
from app.schemas.scoring_llm import LLMDimension, LLMRequirementCategory, LLMScoringOutput, RequirementCheck

# JD mẫu Backend Java trong docs/DE_XUAT_CHAM_DIEM_CV.md (Bước 1).
BACKEND_JAVA_JD = """
{
  "job_title": "Lập trình viên Backend Java",
  "skills": [
    {"name": "Java", "importance": "REQUIRED", "source_text": "Bắt buộc thành thạo Java, Spring Boot, SQL"},
    {"name": "Spring Boot", "importance": "REQUIRED", "source_text": "Bắt buộc thành thạo Java, Spring Boot, SQL"},
    {"name": "SQL", "importance": "REQUIRED", "source_text": "Bắt buộc thành thạo Java, Spring Boot, SQL"},
    {"name": "Docker", "importance": "PREFERRED", "source_text": "Biết Docker là lợi thế"}
  ],
  "tasks": ["Xây dựng API", "Thiết kế cơ sở dữ liệu", "Sửa lỗi"],
  "experience": {"min_years": 3, "seniority": null, "importance": "REQUIRED",
                 "source_text": "Tối thiểu 3 năm kinh nghiệm"},
  "education": {"degree_text": "Tốt nghiệp Đại học", "fields": ["Công nghệ thông tin"], "importance": "REQUIRED",
                "source_text": "Tốt nghiệp Đại học ngành Công nghệ thông tin"},
  "certifications": [],
  "domains": [{"name": "Ngân hàng", "importance": "PREFERRED", "source_text": "Ưu tiên có kinh nghiệm ngân hàng"}]
}
"""


def test_backend_java_sample_parses():
    jd = ExtractedJD.model_validate_json(BACKEND_JAVA_JD)
    assert [s.name for s in jd.skills if s.importance == Importance.REQUIRED] == ["Java", "Spring Boot", "SQL"]
    assert jd.experience.min_years == 3
    assert jd.education.degree_text == "Tốt nghiệp Đại học"
    assert jd.certifications == []
    assert jd.domains[0].importance == Importance.PREFERRED
    assert ExtractedJD.model_validate_json(jd.model_dump_json()) == jd


def test_empty_extracted_jd_is_valid():
    jd = ExtractedJD()
    assert jd.job_title is None and jd.experience is None and jd.education is None
    assert jd.skills == [] and jd.tasks == [] and jd.certifications == [] and jd.domains == []


def test_importance_has_labels():
    assert set(IMPORTANCE_LABELS) == set(Importance)


def test_unknown_importance_rejected():
    data = json.loads(BACKEND_JAVA_JD)
    data["skills"][0]["importance"] = "NICE_TO_HAVE"
    with pytest.raises(ValidationError):
        ExtractedJD.model_validate(data)


def test_negative_min_years_rejected():
    with pytest.raises(ValidationError):
        ExperienceRequirement(min_years=-1, importance=Importance.REQUIRED)
    assert ExperienceRequirement(min_years=0.5, importance=Importance.REQUIRED).min_years == 0.5


def test_llm_dimension_is_subset_of_scoring_dimension():
    assert {d.value for d in LLMDimension} == {"TECHNICAL_SKILLS", "RELEVANT_EXPERIENCE", "DOMAIN"}
    assert {d.value for d in LLMDimension} <= {d.value for d in ScoringDimension}


def _llm_output_data() -> dict:
    return {
        "dimensions": [
            {"dimension": "TECHNICAL_SKILLS", "applicable": True, "level": 3,
             "evidence": ["Phát triển REST API bằng Java Spring Boot"], "reason": "Đã dùng đủ kỹ năng bắt buộc."},
            {"dimension": "RELEVANT_EXPERIENCE", "applicable": True, "level": 3,
             "evidence": ["Thiết kế cơ sở dữ liệu PostgreSQL"], "reason": "Đã làm vai trò tương tự."},
            {"dimension": "DOMAIN", "applicable": True, "level": 1, "evidence": [],
             "reason": "Chỉ làm thương mại điện tử."},
        ],
        "education_field": {"match": "EXACT", "evidence": "Cử nhân Công nghệ thông tin"},
        "requirement_checks": [
            {"requirement": "Java", "category": "SKILL", "status": "MET",
             "evidence": "Phát triển REST API bằng Java Spring Boot"},
            {"requirement": "SQL", "category": "SKILL", "status": "UNKNOWN", "evidence": None},
        ],
        "summary": "Hồ sơ đáp ứng tốt kỹ năng; thiếu kinh nghiệm ngành ngân hàng.",
    }


def _field_names(model: type[BaseModel]) -> set[str]:
    names: set[str] = set()
    for name, f in model.model_fields.items():
        names.add(name)
        for arg in getattr(f.annotation, "__args__", ()) + (f.annotation,):
            if isinstance(arg, type) and issubclass(arg, BaseModel):
                names |= _field_names(arg)
    return names


def test_llm_scoring_output_sample_parses_and_has_no_score_field():
    out = LLMScoringOutput.model_validate(_llm_output_data())
    assert out.requirement_checks[1].status == RequirementStatus.UNKNOWN
    assert not [n for n in _field_names(LLMScoringOutput) if "score" in n.lower()]
    assert "score" not in json.dumps(LLMScoringOutput.model_json_schema()["properties"]).lower()


def test_llm_requirement_category_is_subset_of_requirement_category():
    assert {c.value for c in LLMRequirementCategory} == {"SKILL", "CERTIFICATION", "DOMAIN"}
    assert all(RequirementCategory(c.value) for c in LLMRequirementCategory)


@pytest.mark.parametrize("category", ["EXPERIENCE_YEARS", "EDUCATION_LEVEL"])
def test_requirement_check_rejects_code_only_category(category):
    with pytest.raises(ValidationError):
        RequirementCheck(requirement="3 năm kinh nghiệm", category=category, status="MET")
    data = _llm_output_data()
    data["requirement_checks"][0]["category"] = category
    with pytest.raises(ValidationError):
        LLMScoringOutput.model_validate(data)


def test_llm_output_rejects_missing_or_extra_dimension():
    data = _llm_output_data()
    data["dimensions"][2]["dimension"] = "TECHNICAL_SKILLS"
    with pytest.raises(ValidationError):
        LLMScoringOutput.model_validate(data)
    data = _llm_output_data()
    data["dimensions"][2]["dimension"] = "SENIORITY"
    with pytest.raises(ValidationError):
        LLMScoringOutput.model_validate(data)
