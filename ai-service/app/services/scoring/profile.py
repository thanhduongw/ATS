"""
Hồ sơ dùng để chấm — lọc từ kết quả trích xuất CV (ExtractedCV) theo danh sách TRẮNG.

Chấm mù: bước chấm KHÔNG nhận tên, email, SĐT, địa chỉ/location, ngày sinh, giới tính, link
LinkedIn/GitHub/portfolio/dự án, `source_text` (đoạn CV gốc có thể chứa các thông tin đó) và
`field_confidences`. Trong văn bản tự do (summary, mô tả công việc/dự án) che tên ứng viên, email, URL.

Không che số điện thoại bằng regex: mẫu số điện thoại khớp nhầm mốc thời gian ("2018 - 2022") và
số liệu ("1 500 000 USD"), làm mất thông tin kinh nghiệm. Các trường SĐT đã bị loại bỏ hẳn.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

# [GIẢI THÍCH] Mẫu tìm email và đường link trong đoạn văn để che đi.
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_URL = re.compile(r"https?://\S+|www\.\S+")

NAME_PLACEHOLDER = "[ứng viên]"

# [GIẢI THÍCH] DANH SÁCH TRẮNG: chỉ các trường liệt kê ở đây mới được gửi cho AI khi chấm.
# Không có tên, email, SĐT, địa chỉ, ngày sinh, giới tính, link. Muốn che thêm trường nào thì xoá khỏi tuple.
_WORK_FIELDS = ("title", "company", "start_date", "end_date", "is_current", "description", "technologies")
_EDU_FIELDS = ("institution", "degree", "field_of_study", "start_date", "end_date", "gpa")
_CERT_FIELDS = ("name", "issuer", "date_obtained", "expiry_date")
_PROJECT_FIELDS = ("name", "description", "technologies", "role")
_LANGUAGE_FIELDS = ("language", "proficiency")
_FREE_TEXT = {"description", "summary"}


# [GIẢI THÍCH] Bỏ dấu tiếng Việt ("Nguyễn" -> "Nguyen") để che được tên viết không dấu.
def _strip_accents(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn").replace("đ", "d").replace("Đ", "D")


# [GIẢI THÍCH] Tạo mẫu tìm tên ứng viên (có dấu và không dấu), tên dài trước để không che dở dang.
def _name_patterns(names: list[str]) -> list[re.Pattern]:
    """Tên đầy đủ (có dấu và không dấu). Không che từng từ lẻ — "An", "Minh" trùng từ thường."""
    variants: set[str] = set()
    for name in names:
        name = " ".join((name or "").split())
        if len(name) >= 3:
            variants.add(name)
            variants.add(_strip_accents(name))
    # Tên dài trước để không che dở dang
    return [re.compile(re.escape(v), re.IGNORECASE) for v in sorted(variants, key=len, reverse=True)]


# [GIẢI THÍCH] Che thông tin cá nhân trong đoạn văn tự do: email -> [email], link -> [url], tên -> [ứng viên].
def redact_free_text(text: str | None, name_patterns: list[re.Pattern]) -> str | None:
    if not text:
        return text
    text = _EMAIL.sub("[email]", text)
    text = _URL.sub("[url]", text)
    for pattern in name_patterns:
        text = pattern.sub(NAME_PLACEHOLDER, text)
    return text


# [GIẢI THÍCH] Chép từ một mục (vd một công việc) CHỈ các trường trong danh sách trắng; đoạn mô tả thì che tên/email/link.
def _pick(item: dict, fields: tuple[str, ...], name_patterns: list[re.Pattern]) -> dict:
    out = {}
    for f in fields:
        value = item.get(f)
        if value in (None, "", []):
            continue
        out[f] = redact_free_text(value, name_patterns) if f in _FREE_TEXT else value
    return out


# [GIẢI THÍCH] CHẤM MÙ: tạo hồ sơ gửi cho AI chấm từ kết quả trích xuất.
# Từ phần thông tin cá nhân CHỈ lấy summary (đã che tên); còn lại lấy kỹ năng, kinh nghiệm, học vấn,
# chứng chỉ, dự án, ngoại ngữ theo danh sách trắng ở trên.
def build_scoring_profile(extracted_cv: dict[str, Any], candidate_names: list[str] | None = None) -> dict[str, Any]:
    """Hồ sơ đã lọc (dict, sẵn sàng đưa vào prompt). `candidate_names`: các cách viết tên cần che."""
    candidate = extracted_cv.get("candidate") or {}
    patterns = _name_patterns([candidate.get("name") or "", *(candidate_names or [])])

    profile: dict[str, Any] = {}
    summary = redact_free_text(candidate.get("summary"), patterns)
    if summary:
        profile["summary"] = summary
    if extracted_cv.get("skills"):
        profile["skills"] = list(extracted_cv["skills"])
    for key, fields in (
        ("work_experience", _WORK_FIELDS),
        ("education", _EDU_FIELDS),
        ("certifications", _CERT_FIELDS),
        ("projects", _PROJECT_FIELDS),
        ("languages", _LANGUAGE_FIELDS),
    ):
        items = [_pick(item, fields, patterns) for item in extracted_cv.get(key) or []]
        items = [i for i in items if i]
        if items:
            profile[key] = items
    if extracted_cv.get("years_of_experience_claimed") is not None:
        profile["years_of_experience_claimed"] = extracted_cv["years_of_experience_claimed"]
    return profile
