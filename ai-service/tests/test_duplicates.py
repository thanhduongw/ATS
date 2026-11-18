"""Phát hiện ứng viên trùng: chuẩn hoá email/SĐT/tên và ngưỡng nhận diện — không DB, không gọi Gemini."""

import pytest

from app.services.cv_indexing import build_cv_profile
from app.services.duplicates import (
    NAME_THRESHOLD, SAME_FILE, SAME_PHONE, SIMILAR_PROFILE, hash_value, is_high_confidence,
    name_similarity, normalize_email, normalize_name, normalize_phone,
)


def test_phone_formats_normalize_to_same_number():
    # Các kiểu viết thật trong CV mẫu: cùng một số 0337605695 viết nhiều cách.
    forms = ["0337605695", "+84 337 605 695", "(+84) 337605695", "033-760-5695", "84337605695", "033 760 5695"]
    assert {normalize_phone(f) for f in forms} == {"0337605695"}


def test_phone_rejects_too_short_or_empty():
    assert normalize_phone("12345") is None
    assert normalize_phone("") is None
    assert normalize_phone(None) is None


def test_email_normalization():
    assert normalize_email("  Tam.Dao@Gmail.COM ") == "tam.dao@gmail.com"
    assert normalize_email("khong-phai-email") is None
    assert normalize_email(None) is None


def test_name_normalization_strips_vietnamese_marks():
    assert normalize_name("ĐÀO ĐỨC TÂM") == "dao duc tam"
    assert normalize_name("  Nguyễn   Văn  A. ") == "nguyen van a"
    assert normalize_name("") is None and normalize_name(None) is None


def test_name_similarity_ignores_word_order_and_diacritics():
    a, b = normalize_name("Nguyễn Văn An"), normalize_name("AN NGUYEN VAN")
    assert name_similarity(a, b) == 1.0


def test_different_people_with_common_vietnamese_names_stay_below_threshold():
    # Hai người thật trong dữ liệu mẫu, cùng họ và tên cuối: KHÔNG được coi là trùng tên.
    a, b = normalize_name("NGUYEN XUAN HIEU"), normalize_name("NGUYEN HOANG HIEU")
    assert name_similarity(a, b) < NAME_THRESHOLD
    c, d = normalize_name("Nguyen Van Truong"), normalize_name("Nguyen Van Bien")
    assert name_similarity(c, d) < NAME_THRESHOLD


def test_same_name_with_typo_is_close():
    a, b = normalize_name("Dao Duc Tam"), normalize_name("Dao Duc Tamm")
    assert name_similarity(a, b) >= NAME_THRESHOLD


def test_hash_is_stable_and_not_plaintext():
    h = hash_value("a@b.com")
    assert h == hash_value("a@b.com") and "a@b.com" not in h and len(h) == 64
    assert hash_value(None) is None


def test_confidence_levels():
    assert is_high_confidence([SAME_FILE]) and is_high_confidence([SAME_PHONE, SIMILAR_PROFILE])
    assert not is_high_confidence([SIMILAR_PROFILE])


def test_profile_carries_identity_fields_for_duplicate_check():
    result = {"extracted_cv": {"candidate": {"name": "ĐÀO ĐỨC TÂM", "email": "Tam@X.com", "phone": "(+84) 825159401"},
                               "skills": ["Java"]}}
    p = build_cv_profile(result)
    assert p.name_norm == "dao duc tam"
    assert p.email_hash == hash_value("tam@x.com")
    assert p.phone_hash == hash_value("0825159401")
    # và các trường đó không lọt vào văn bản được embed
    assert "tam@x.com" not in (p.doc_text + "".join(c.content for c in p.chunks)).lower()
