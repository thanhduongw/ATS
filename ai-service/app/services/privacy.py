"""Che thông tin cá nhân (PII) trong CV trước khi gửi Gemini, và so khớp câu trích với nguồn.

Chép từ `research/privacy.py`. Khác nghiên cứu: nghiên cứu có người duyệt từng file CV đã ẩn danh trước khi gọi
Gemini; sản phẩm chạy tự động nên KHÔNG có bước duyệt. `remaining_contact_indicators` còn dấu hiệu thì chỉ ghi cảnh báo
(ai_jobs.guardrail_warnings), không chặn việc chấm.
"""

from __future__ import annotations

import re
import unicodedata

EMAIL = re.compile(r"(?i)\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b")
URL = re.compile(r"(?i)\b(?:https?://|www\.|(?:linkedin|github|facebook)\.com/)\S+")
PHONE = re.compile(r"(?<!\w)(?:\+?84|0)(?:[\s.\-]?\d){9,10}(?!\w)")
PERSONAL_LABEL = re.compile(
    r"(?i)^\s*(?:họ\s*(?:và\s*)?tên|tên ứng viên|full\s*name|candidate\s*name|name|địa chỉ|address|nơi ở|nơi sinh|"
    r"sinh ngày|ngày sinh|date\s*of\s*birth|dob|giới tính|gender|số điện thoại|phone|mobile|liên hệ|contact|email|"
    r"e-mail|linkedin|facebook|github\s*profile|cccd|cmnd|mã số định danh)\s*[:：\-–|]", re.I)
DOB_LINE = re.compile(r"(?i)\b(?:ngày sinh|dob|date of birth|giới tính|gender|cccd|cmnd)\b")
# Chỉ 8 dòng đầu, tự động che dòng in hoa có 2--5 từ và không giống tiêu đề CV/ngành học.
UPPER_EXCLUDE = {
    "curriculum", "vitae", "developer", "engineer", "backend", "frontend", "fullstack", "javascript", "java", "react",
    "software", "education", "experience", "skills", "profile", "resume", "cv", "about", "career", "objective",
    "công", "nghệ", "thông", "tin", "kỹ", "năng", "học", "vấn",
}


def redact(text: str) -> str:
    lines = []
    for index, raw in enumerate(text.splitlines()):
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        if PERSONAL_LABEL.match(line) or DOB_LINE.search(line):
            lines.append("[ĐÃ ẨN THÔNG TIN CÁ NHÂN]")
            continue
        if index < 8 and 2 <= len(line.split()) <= 5 and 5 <= len(line) <= 65:
            words = line.split()
            low = {unicodedata.normalize("NFKD", w).encode("ascii", "ignore").decode().lower() for w in words}
            upper = all(w[:1].isupper() for w in words if w[:1].isalpha())
            is_caps = any(w.isupper() and len(w) >= 2 for w in words)
            if upper and is_caps and not (low & UPPER_EXCLUDE) and not any(c.isdigit() for c in line):
                lines.append("[TÊN ỨNG VIÊN ĐÃ ẨN — XÁC MINH THỦ CÔNG]")
                continue
        line = EMAIL.sub("[EMAIL_ẨN]", line)
        line = URL.sub("[URL_ẨN]", line)
        line = PHONE.sub("[SĐT_ẨN]", line)
        lines.append(line)
    return "\n".join(lines).strip() + "\n"


def remaining_contact_indicators(text: str) -> list[str]:
    indicators = []
    if EMAIL.search(text):
        indicators.append("email")
    if URL.search(text):
        indicators.append("url")
    if PHONE.search(text):
        indicators.append("phone")
    if PERSONAL_LABEL.search(text):
        indicators.append("personal_label")
    return indicators


def quote_in_source(quote: str, source: str) -> bool:
    """Chuẩn hoá Unicode, khoảng trắng, dấu câu đủ để chịu được xuống dòng thường gặp của PDF."""
    def norm(s: str):
        s = unicodedata.normalize("NFKC", s).casefold()
        s = re.sub(r"[^\w\d]+", "", s, flags=re.UNICODE)
        return s
    q, s = norm(quote), norm(source)
    return len(q) >= 3 and q in s
