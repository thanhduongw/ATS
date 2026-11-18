"""Ước lượng số năm kinh nghiệm từ văn bản CV (chỉ để lọc Talent Pool; KHÔNG dùng để chấm điểm).

CVFacts chỉ có câu trích nên thường thiếu ngày tháng; ngày tháng nằm trong văn bản CV. Hàm ở đây đọc phần "Kinh nghiệm"
của văn bản (không đọc học vấn/dự án để khỏi cộng nhầm thời gian học) và lấy hợp các khoảng "tháng/năm – tháng/năm|nay".
Không đọc được khoảng nào thì trả None (bộ lọc số năm sẽ loại hồ sơ đó, như khi chưa rõ số năm).
"""

from __future__ import annotations

import re
from datetime import datetime

_MONTH_YEAR = r"(?:(\d{1,2})\s*[/.\-]\s*)?((?:19|20)\d{2})"
_PRESENT = r"(?:nay|hiện tại|hiện nay|present|now|current|đến nay)"
# Khoảng cách giữa hai mốc: gạch/“đến” hoặc chỉ khoảng trắng (PDF hay làm mất dấu gạch: "03/2024 03/2025").
_RANGE = re.compile(rf"{_MONTH_YEAR}(?:\s*(?:-|–|—|đến|to)\s*|\s+)(?:{_MONTH_YEAR}|({_PRESENT}))", re.IGNORECASE)

_START = re.compile(r"(?i)^\W*(kinh nghiệm(?:\s+làm việc)?|work\s+experience|professional\s+experience|employment(?:\s+history)?|experience)\W*$")
_END = re.compile(
    r"(?i)^\W*(học vấn|trình độ học vấn|education|kỹ năng|skills?|dự án|projects?|chứng chỉ|certifications?|"
    r"giải thưởng|awards?|sở thích|interests?|hoạt động|activities|ngoại ngữ|languages?|mục tiêu|objective|"
    r"thông tin|người tham chiếu|references?)\W*$")


def work_section(text: str) -> str | None:
    """Các dòng dưới tiêu đề 'Kinh nghiệm' đến tiêu đề mục kế tiếp; không có tiêu đề thì None."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if _START.match(line.strip()):
            out: list[str] = []
            for nxt in lines[i + 1:]:
                if _END.match(nxt.strip()):
                    break
                out.append(nxt)
            return "\n".join(out)
    return None


def _month_index(month: str | None, year: str, *, end: bool) -> int:
    m = int(month) if month and 1 <= int(month) <= 12 else (12 if end else 1)
    return int(year) * 12 + m


def estimate_years(chunks: list[str], today: datetime | None = None) -> float | None:
    """Hợp các khoảng thời gian trong các đoạn văn bản, tính bằng năm (làm tròn 0,1)."""
    today = today or datetime.utcnow()
    now_idx = today.year * 12 + today.month
    spans: list[tuple[int, int]] = []
    for q in chunks:
        for m in _RANGE.finditer(q):
            sm, sy, em, ey, present = m.groups()
            start = _month_index(sm, sy, end=False)
            end = now_idx if present else _month_index(em, ey, end=True) if ey else None
            if end is None or end < start or end > now_idx + 1:
                continue
            spans.append((start, end))
    if not spans:
        return None
    spans.sort()
    total, cur_s, cur_e = 0, spans[0][0], spans[0][1]
    for s_, e_ in spans[1:]:
        if s_ > cur_e:
            total += cur_e - cur_s + 1
            cur_s, cur_e = s_, e_
        else:
            cur_e = max(cur_e, e_)
    total += cur_e - cur_s + 1
    return round(total / 12, 1)


def years_from_cv_text(text: str, today: datetime | None = None) -> float | None:
    section = work_section(text)
    return estimate_years([section], today) if section else None
