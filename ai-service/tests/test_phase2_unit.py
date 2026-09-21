"""
Phase 2 Unit Tests — Deterministic logic.

Tests the Python-calculated parts that don't require LLM:
- Date parsing (EN/VI formats, edge cases)
- Years of experience calculation (overlap merging)
- Confidence scoring
- Completeness assessment
- Pydantic schema validation/rejection
"""

import pytest
from datetime import date

from app.schemas.cv_extraction import (
    CandidateInfo,
    CompletenessLevel,
    ConfidenceLevel,
    CVExtractionResult,
    Education,
    ExtractedCV,
    FieldConfidence,
    WorkExperience,
)
from app.services.cv_extraction_engine import (
    _parse_date,
    calculate_years_of_experience,
    compute_completeness,
    compute_overall_confidence,
)


# ============================================================
# Date Parsing Tests
# ============================================================

class TestParseDate:
    """Test flexible date parsing (EN + VI formats)."""

    def test_iso_year_month(self):
        assert _parse_date("2020-01") == date(2020, 1, 1)

    def test_iso_full(self):
        assert _parse_date("2020-01-15") == date(2020, 1, 1)

    def test_year_only(self):
        assert _parse_date("2020") == date(2020, 1, 1)

    def test_slash_format(self):
        assert _parse_date("01/2020") == date(2020, 1, 1)
        assert _parse_date("6/2023") == date(2023, 6, 1)

    def test_english_month_short(self):
        assert _parse_date("Jan 2020") == date(2020, 1, 1)
        assert _parse_date("Dec 2023") == date(2023, 12, 1)

    def test_english_month_long(self):
        assert _parse_date("January 2020") == date(2020, 1, 1)
        assert _parse_date("December 2023") == date(2023, 12, 1)

    def test_vietnamese_month(self):
        assert _parse_date("Tháng 1/2020") == date(2020, 1, 1)
        assert _parse_date("Tháng 12/2023") == date(2023, 12, 1)

    def test_present_variants(self):
        today = date.today()
        assert _parse_date("Present") == today
        assert _parse_date("Hiện tại") == today
        assert _parse_date("Now") == today
        assert _parse_date("Current") == today
        assert _parse_date("Nay") == today

    def test_none_input(self):
        assert _parse_date(None) is None

    def test_empty_string(self):
        assert _parse_date("") is None

    def test_unparseable(self):
        assert _parse_date("some random text") is None

    def test_whitespace(self):
        assert _parse_date("  2020  ") == date(2020, 1, 1)


# ============================================================
# Years of Experience Calculation Tests
# ============================================================

class TestCalculateYears:
    """Test deterministic years calculation from work history."""

    def test_single_job(self):
        """2 years at one job."""
        exp = [
            WorkExperience(
                company="ACME", title="Dev",
                start_date="2020", end_date="2022",
            )
        ]
        result = calculate_years_of_experience(exp)
        assert result is not None
        assert 1.9 <= result <= 2.1

    def test_multiple_non_overlapping(self):
        """Two non-overlapping jobs."""
        exp = [
            WorkExperience(
                company="A", title="Dev",
                start_date="2018", end_date="2020",
            ),
            WorkExperience(
                company="B", title="Senior Dev",
                start_date="2021", end_date="2023",
            ),
        ]
        result = calculate_years_of_experience(exp)
        assert result is not None
        assert 3.9 <= result <= 4.1

    def test_overlapping_jobs_not_double_counted(self):
        """Overlapping date ranges must be merged, not double-counted."""
        exp = [
            WorkExperience(
                company="A", title="Dev",
                start_date="2020", end_date="2023",
            ),
            WorkExperience(
                company="B", title="Freelance",
                start_date="2021", end_date="2022",
            ),
        ]
        # Should be ~3 years, not 4
        result = calculate_years_of_experience(exp)
        assert result is not None
        assert 2.9 <= result <= 3.1

    def test_current_job(self):
        """is_current=True should use today's date."""
        exp = [
            WorkExperience(
                company="C", title="Lead",
                start_date="2023-01", is_current=True,
            )
        ]
        result = calculate_years_of_experience(exp)
        assert result is not None
        assert result >= 1.0  # At least some time has passed

    def test_no_dates(self):
        """Jobs without dates → None."""
        exp = [
            WorkExperience(company="D", title="Intern")
        ]
        result = calculate_years_of_experience(exp)
        assert result is None

    def test_empty_list(self):
        result = calculate_years_of_experience([])
        assert result is None


# ============================================================
# Confidence Tests
# ============================================================

class TestConfidence:
    """Test overall confidence calculation."""

    def _make_cv(self, confidences: dict[str, ConfidenceLevel]) -> ExtractedCV:
        return ExtractedCV(
            candidate=CandidateInfo(name="Test"),
            field_confidences=[
                FieldConfidence(field_name=k, confidence=v)
                for k, v in confidences.items()
            ],
        )

    def test_all_high(self):
        cv = self._make_cv({
            "name": ConfidenceLevel.HIGH,
            "email": ConfidenceLevel.HIGH,
            "phone": ConfidenceLevel.HIGH,
            "skills": ConfidenceLevel.HIGH,
            "work_experience": ConfidenceLevel.HIGH,
            "education": ConfidenceLevel.HIGH,
        })
        assert compute_overall_confidence(cv) == ConfidenceLevel.HIGH

    def test_all_low(self):
        cv = self._make_cv({
            "name": ConfidenceLevel.LOW,
            "skills": ConfidenceLevel.LOW,
            "work_experience": ConfidenceLevel.LOW,
            "education": ConfidenceLevel.LOW,
        })
        assert compute_overall_confidence(cv) == ConfidenceLevel.LOW

    def test_mixed(self):
        cv = self._make_cv({
            "name": ConfidenceLevel.HIGH,
            "skills": ConfidenceLevel.MEDIUM,
            "work_experience": ConfidenceLevel.HIGH,
            "education": ConfidenceLevel.LOW,
        })
        # Weighted: HIGH(3) + MEDIUM(3) + HIGH(3) + LOW(2) = 1*3 + 0.6*3 + 1*3 + 0.2*2 = 8.2/11 ≈ 0.745
        assert compute_overall_confidence(cv) == ConfidenceLevel.HIGH

    def test_no_confidences(self):
        cv = ExtractedCV(candidate=CandidateInfo(name="Test"))
        assert compute_overall_confidence(cv) == ConfidenceLevel.LOW


# ============================================================
# Completeness Tests
# ============================================================

class TestCompleteness:
    """Test completeness assessment (independent of confidence)."""

    def test_complete_cv(self):
        cv = ExtractedCV(
            candidate=CandidateInfo(name="Test", email="test@mail.com", summary="..."),
            skills=["Java", "Python"],
            work_experience=[WorkExperience(company="A", title="Dev")],
            education=[Education(institution="UNI")],
        )
        level, details = compute_completeness(cv)
        assert level == CompletenessLevel.COMPLETE
        assert details["name"] is True
        assert details["skills"] is True
        assert details["email"] is True

    def test_partial_cv(self):
        """Has name + skills but no work experience."""
        cv = ExtractedCV(
            candidate=CandidateInfo(name="Test"),
            skills=["Java"],
        )
        level, details = compute_completeness(cv)
        assert level == CompletenessLevel.PARTIAL
        assert details["work_experience"] is False

    def test_minimal_cv(self):
        """Only has name."""
        cv = ExtractedCV(
            candidate=CandidateInfo(name="Test"),
        )
        level, details = compute_completeness(cv)
        assert level == CompletenessLevel.MINIMAL


# ============================================================
# Schema Validation Tests
# ============================================================

class TestSchemaValidation:
    """Test Pydantic schema enforcement."""

    def test_valid_full_cv(self):
        """Complete CV JSON should validate."""
        data = {
            "candidate": {
                "name": "Nguyễn Văn A",
                "email": "nguyenvana@gmail.com",
                "phone": "0912345678",
            },
            "skills": ["Java", "Spring Boot", "React"],
            "work_experience": [
                {
                    "company": "FPT Software",
                    "title": "Java Developer",
                    "start_date": "2020-01",
                    "end_date": "2023-06",
                    "source_text": "Java Developer at FPT Software (01/2020 - 06/2023)",
                }
            ],
            "education": [
                {
                    "institution": "Đại học Bách Khoa",
                    "degree": "Cử nhân",
                    "field_of_study": "Công nghệ thông tin",
                }
            ],
        }
        cv = ExtractedCV.model_validate(data)
        assert cv.candidate.name == "Nguyễn Văn A"
        assert len(cv.skills) == 3
        assert cv.work_experience[0].company == "FPT Software"

    def test_minimal_cv_just_name(self):
        """CV with only a name should validate (all else defaults)."""
        cv = ExtractedCV.model_validate({
            "candidate": {"name": "Test"}
        })
        assert cv.candidate.name == "Test"
        assert cv.skills == []
        assert cv.work_experience == []
        assert cv.years_of_experience_claimed is None

    def test_missing_name_fails(self):
        """Name is required — should fail validation."""
        with pytest.raises(Exception):
            ExtractedCV.model_validate({
                "candidate": {}
            })

    def test_invalid_schema_rejected(self):
        """Completely wrong schema should fail."""
        with pytest.raises(Exception):
            ExtractedCV.model_validate({"foo": "bar"})

    def test_no_bias_fields_in_schema(self):
        """Ensure schema doesn't have bias-prone fields."""
        fields = set()
        for f in CandidateInfo.model_fields:
            fields.add(f)
        # These should NOT exist
        assert "gender" not in fields
        assert "age" not in fields
        assert "date_of_birth" not in fields
        assert "religion" not in fields
        assert "marital_status" not in fields
        assert "photo" not in fields
        # name SHOULD exist
        assert "name" in fields


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
