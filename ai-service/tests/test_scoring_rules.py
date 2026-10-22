"""Phần 3: quy tắc chấm bằng code (app/services/scoring/rules.py) — Python thuần, không LLM, không DB."""

from datetime import date

import pytest

from app.schemas.jd_extraction import ExtractedJD, Importance, RequirementItem
from app.schemas.scoring import RequirementCategory, RequirementStatus
from app.schemas.scoring_llm import FieldMatch
from app.services.scoring.rules import (
    DEGREE_LEVEL_LABELS,
    ONET_EXPERIENCE_BANDS,
    CheckItem,
    candidate_degree_level,
    check_education_requirement,
    check_years_requirement,
    degree_level,
    education_outcome,
    highest_degree_level,
    items_to_check,
    min_degree_level,
    onet_band,
    seniority_outcome,
)

M = 1 / 12  # 1 tháng


# ============================================================
# 11 khoảng O*NET
# ============================================================

def test_eleven_bands_with_labels():
    assert [b for b, _, _ in ONET_EXPERIENCE_BANDS] == list(range(1, 12))
    assert all(label.strip() for _, _, label in ONET_EXPERIENCE_BANDS)


@pytest.mark.parametrize("years, band", [
    (0, 1), (-1, 1),
    (0.01, 2), (1 * M, 2),                 # đúng 1 tháng -> khoảng "đến 1 tháng"
    (1 * M + 0.001, 3), (3 * M, 3),
    (3 * M + 0.001, 4), (0.5, 4),          # đúng 6 tháng
    (0.51, 5), (1.0, 5),                   # đúng 1 năm -> "6 tháng–1 năm"
    (1.01, 6), (2.0, 6),
    (2.5, 7), (3.0, 7), (4.0, 7),
    (4.5, 8), (6.0, 8),
    (7.0, 9), (8.0, 9),
    (9.0, 10), (10.0, 10),                 # đúng 10 năm
    (10.01, 11), (25.0, 11),               # trên 10 năm
])
def test_onet_band_boundaries(years, band):
    assert onet_band(years) == band


# ============================================================
# Mức tiêu chí Số năm kinh nghiệm
# ============================================================

@pytest.mark.parametrize("candidate, level", [(2.5, 2), (1.0, 1), (5.0, 3), (7.0, 4)])
def test_seniority_examples_from_docs(candidate, level):
    """Ví dụ trong docs: JD yêu cầu 3 năm (khoảng 2–4 năm)."""
    assert seniority_outcome(candidate, 3).level == level


def test_seniority_evidence_format():
    out = seniority_outcome(2.5, 3)
    assert out.evidence == "2,5 năm (khoảng O*NET 2–4 năm); JD yêu cầu 3 năm (khoảng 2–4 năm)"
    assert out.reason


def test_seniority_not_applicable_when_jd_has_no_years():
    assert seniority_outcome(5.0, None) is None


def test_seniority_unknown_when_cv_has_no_dates():
    out = seniority_outcome(None, 3)
    assert out.level is None and "không" in out.reason.lower()


def test_seniority_required_zero_is_level_3():
    assert seniority_outcome(0, 0).level == 3
    assert seniority_outcome(4, 0).level == 3
    out = seniority_outcome(None, 0)   # JD không đòi kinh nghiệm: không cần biết số năm của CV
    assert out.level == 3 and "không yêu cầu" in out.reason


def test_seniority_candidate_zero_is_level_0():
    assert seniority_outcome(0, 2).level == 0


@pytest.mark.parametrize("candidate, required, level", [
    (3.0, 3.0, 3),     # đúng N
    (4.0, 3.0, 3),     # cùng khoảng
    (6.0, 3.0, 3),     # cao hơn 1 khoảng
    (6.01, 3.0, 4),    # cao hơn 2 khoảng
    (1.5, 3.0, 2),     # thấp hơn 1 khoảng
    (0.5, 1.0, 2),     # thấp hơn 1 khoảng (4 vs 5)
    (0.25, 1.0, 1),    # thấp hơn 2 khoảng
    (0.5, 0.5, 3),     # "6 tháng"
])
def test_seniority_band_comparisons(candidate, required, level):
    assert seniority_outcome(candidate, required).level == level


# ============================================================
# Bậc học
# ============================================================

@pytest.mark.parametrize("text, level", [
    ("Tiến sĩ Khoa học máy tính", 8), ("tien si", 8), ("PhD in CS", 8), ("Ph.D.", 8), ("Doctorate", 8),
    ("Thạc sĩ", 7), ("THẠC SĨ QTKD", 7), ("Master of Science", 7), ("MBA", 7), ("MSc", 7), ("M.Sc.", 7),
    ("Cử nhân", 6), ("cu nhan CNTT", 6), ("Kỹ sư phần mềm", 6), ("Ky su", 6), ("Đại học", 6),
    ("Tốt nghiệp Đại học", 6), ("DAI HOC", 6), ("Bachelor of Engineering", 6), ("Bachelor's degree", 6),
    ("B.Sc.", 6), ("BSc", 6), ("B.A.", 6), ("B.E.", 6), ("Engineer's degree", 6), ("University degree", 6),
    ("Cao đẳng", 5), ("Cao đẳng trở lên", 5), ("College diploma", 5), ("Associate degree", 5),
    ("Trung cấp", 4), ("Vocational certificate", 4),
    ("Sơ cấp", 2),
    ("Sau đại học", 7), ("Postgraduate diploma", 7), ("Post-graduate", 7),
    ("B.Eng in Software", 6), ("BEng", 6), ("Bachelor of Engineering", 6), ("M.Eng", 7), ("MEng", 7),
    ("Đại học hoặc Cao đẳng", 6),   # CV: lấy bậc cao nhất
])
def test_degree_level_recognized(text, level):
    assert degree_level(text) == level


@pytest.mark.parametrize("text", [None, "", "   ", "Chứng chỉ IELTS 7.0", "Tốt nghiệp THPT", "Khóa học online",
                                  "BA", "Business Analyst (BA)"])
def test_degree_level_unknown_is_none(text):
    assert degree_level(text) is None


@pytest.mark.parametrize("text, level", [
    ("Tốt nghiệp Đại học hoặc Cao đẳng", 5),
    ("Cao đẳng trở lên", 5),
    ("Thạc sĩ hoặc Đại học", 6),
    ("Đại học", 6),
    ("Sau đại học", 7),          # không tính thêm "đại học" nằm bên trong
    ("Bachelor's or Master's degree", 6),
    ("Chuỗi lạ", None),
    (None, None),
])
def test_min_degree_level_for_jd(text, level):
    assert min_degree_level(text) == level


def test_degree_labels_cover_all_levels():
    assert set(DEGREE_LEVEL_LABELS) == {2, 4, 5, 6, 7, 8}


def test_highest_degree_level():
    edu = [{"degree": "Cử nhân", "field_of_study": "CNTT"}, {"degree": "Thạc sĩ"}, {"degree": "Khóa học online"}]
    assert highest_degree_level(edu) == 7
    assert highest_degree_level([{"degree": None, "field_of_study": "Đại học CNTT"}]) is None  # chỉ dùng "degree"
    assert highest_degree_level([]) is None
    assert highest_degree_level([{"degree": "lạ"}]) is None


# ============================================================
# Bậc học của ứng viên — suy từ tên trường khi CV không ghi bằng (quy ước của nhóm)
# ============================================================

TODAY = date(2026, 10, 22)


def _edu(institution, end=None, start=None, degree=None):
    return {"institution": institution, "degree": degree, "start_date": start, "end_date": end}


@pytest.mark.parametrize("entry, level", [
    (_edu("Đại học Bách Khoa TP.HCM", end="2020"), 6),
    (_edu("Học viện Công nghệ Bưu chính Viễn thông", end="2021"), 6),
    (_edu("Ho Chi Minh City University of Technology", end="06/2019"), 6),
    (_edu("Cao đẳng FPT Polytechnic", end="2022"), 5),
    (_edu("FPT Polytechnic College", end="2022"), 5),
])
def test_degree_inferred_from_institution(entry, level):
    got, note = candidate_degree_level([entry], TODAY)
    assert got == level and note == f"suy từ tên trường: {entry['institution']}"


@pytest.mark.parametrize("entry", [
    _edu("Đại học Bách Khoa TP.HCM", end="Hiện tại"),       # đang học
    _edu("Đại học Bách Khoa TP.HCM", end="đến nay"),
    _edu("Đại học Bách Khoa TP.HCM", end="2027"),           # tốt nghiệp ở tương lai
    _edu("Đại học Bách Khoa TP.HCM", start="2024"),         # chưa đủ 4 năm, không có ngày kết thúc
    _edu("Đại học Bách Khoa TP.HCM"),                       # không có mốc thời gian nào
    _edu("Trung tâm Tin học", end="2020"),                  # tên trường không cho biết bậc
])
def test_degree_not_inferred(entry):
    assert candidate_degree_level([entry], TODAY) == (None, None)


def test_degree_inferred_when_started_four_years_ago_without_end():
    assert candidate_degree_level([_edu("Đại học Bách Khoa TP.HCM", start="2015")], TODAY)[0] == 6


def test_written_degree_wins_without_note():
    assert candidate_degree_level([_edu("Đại học Bách Khoa TP.HCM", end="2022", degree="Thạc sĩ")], TODAY) == (7, None)
    both = [_edu("Đại học Bách Khoa TP.HCM", end="2020"), _edu("Đại học Kinh tế", end="2022", degree="Cử nhân")]
    assert candidate_degree_level(both, TODAY) == (6, None)          # cùng bậc: ưu tiên mục ghi bằng


@pytest.mark.parametrize("entries, expected", [
    ([_edu("Đại học Bách Khoa TP.HCM", end="Hiện tại", degree="Kỹ sư")], (None, None)),   # đang học, chưa có bằng
    ([_edu("Đại học Kinh tế", end="2027", degree="Cử nhân")], (None, None)),             # tốt nghiệp ở tương lai
    ([_edu("Đại học Bách Khoa", end="đến nay", degree="Thạc sĩ"),
      _edu("Đại học Bách Khoa", end="2020", degree="Cử nhân")], (6, None)),             # thạc sĩ đang học không tính
    ([_edu("Đại học Kinh tế", degree="Cử nhân")], (6, None)),                            # end_date trống: tính như cũ
    ([_edu("Đại học Kinh tế", end="không rõ", degree="Cử nhân")], (6, None)),            # end_date không đọc được
])
def test_degree_in_progress_not_counted(entries, expected):
    assert candidate_degree_level(entries, TODAY) == expected


def test_highest_degree_level_unchanged():
    assert highest_degree_level([_edu("Đại học Bách Khoa", end="Hiện tại", degree="Kỹ sư")]) == 6
    assert highest_degree_level([_edu("Đại học Bách Khoa TP.HCM", end="2020")]) is None


# ============================================================
# Danh sách yêu cầu cần Gemini kiểm tra
# ============================================================

def _item(name, importance=Importance.REQUIRED):
    return RequirementItem(name=name, importance=importance)


def test_items_to_check_filters_and_dedups():
    jd = ExtractedJD(
        skills=[_item("Java"), _item("Docker", Importance.PREFERRED), _item("java"), _item("SQL")],
        certifications=[_item("AWS", Importance.PREFERRED), _item("ISTQB")],
        domains=[_item("Ngân hàng", Importance.PREFERRED), _item("Bảo hiểm")],
    )
    assert items_to_check(jd) == [
        CheckItem("Java", RequirementCategory.SKILL, Importance.REQUIRED),
        CheckItem("SQL", RequirementCategory.SKILL, Importance.REQUIRED),
        CheckItem("AWS", RequirementCategory.CERTIFICATION, Importance.PREFERRED),
        CheckItem("ISTQB", RequirementCategory.CERTIFICATION, Importance.REQUIRED),
        CheckItem("Bảo hiểm", RequirementCategory.DOMAIN, Importance.REQUIRED),
    ]


def test_items_to_check_duplicate_keeps_required():
    jd = ExtractedJD(certifications=[_item("AWS", Importance.PREFERRED), _item("aws")])
    assert items_to_check(jd) == [CheckItem("AWS", RequirementCategory.CERTIFICATION, Importance.REQUIRED)]


def test_items_to_check_empty_jd():
    assert items_to_check(ExtractedJD()) == []


# ============================================================
# Mức tiêu chí Học vấn và chứng chỉ
# ============================================================

E, R, U, K = FieldMatch.EXACT, FieldMatch.RELATED, FieldMatch.UNRELATED, FieldMatch.UNKNOWN


@pytest.mark.parametrize("cand, req, fm, restricted, req_certs, pref_cert, level", [
    # Phần bậc học
    (None, 6, E, True, None, False, None),   # CV không nhận ra bằng
    (4, 6, E, True, None, False, 0),         # thấp hơn 2 bậc
    (2, 6, E, True, None, False, 0),         # thấp hơn nhiều bậc
    (5, 6, E, True, None, False, 1),         # thấp hơn 1 bậc
    # Đủ bậc: ngành
    (6, 6, U, True, None, False, 1),
    (6, 6, R, True, None, False, 2),
    (6, 6, K, True, None, False, 2),         # JD giới hạn ngành, CV không ghi ngành
    (6, 6, None, True, None, False, 2),
    (6, 6, E, True, None, False, 3),
    (6, 6, U, False, None, False, 3),        # JD không giới hạn ngành -> bỏ qua ngành
    (6, 6, K, False, None, False, 3),
    # Chứng chỉ
    (6, 6, E, True, False, False, 2),        # thiếu chứng chỉ bắt buộc
    (6, 6, E, True, True, False, 3),
    (6, 6, E, True, False, True, 2),         # thiếu bắt buộc thì không lên 4
    # Mức 4
    (7, 6, E, True, None, False, 4),         # cao hơn bậc yêu cầu
    (7, 6, R, True, None, False, 2),         # cao hơn bậc nhưng ngành gần -> không lên 4
    (6, 6, E, True, True, True, 4),          # có chứng chỉ ưu tiên
    # JD không yêu cầu bậc
    (None, None, E, False, None, False, 3),
    (6, None, E, False, None, True, 4),
    (6, None, E, False, None, False, 3),     # không có bậc yêu cầu thì không xét "cao hơn"
])
def test_education_outcome_branches(cand, req, fm, restricted, req_certs, pref_cert, level):
    assert education_outcome(cand, req, fm, restricted, req_certs, pref_cert).level == level


def test_education_outcome_evidence_names_levels():
    out = education_outcome(5, 6, E, True, None, False)
    assert "Cao đẳng (bậc 5)" in out.evidence and "Đại học (bậc 6)" in out.evidence
    assert out.reason


# ============================================================
# Kiểm tra yêu cầu bắt buộc bằng code
# ============================================================

@pytest.mark.parametrize("cand, req, status", [
    (None, 3, RequirementStatus.UNKNOWN),
    (3, 3, RequirementStatus.MET),
    (5, 3, RequirementStatus.MET),
    (2.9, 3, RequirementStatus.UNMET),
    (0, 0, RequirementStatus.MET),
    (None, 0, RequirementStatus.MET),      # JD không đòi kinh nghiệm
    (None, None, RequirementStatus.MET),
])
def test_check_years_requirement(cand, req, status):
    assert check_years_requirement(cand, req) == status


@pytest.mark.parametrize("cand, req, status", [
    (None, 6, RequirementStatus.UNKNOWN),
    (6, 6, RequirementStatus.MET),
    (7, 6, RequirementStatus.MET),
    (5, 6, RequirementStatus.UNMET),
])
def test_check_education_requirement(cand, req, status):
    assert check_education_requirement(cand, req) == status
