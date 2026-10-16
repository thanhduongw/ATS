"""
Số năm kinh nghiệm — Python thuần, tất định (không gọi LLM).

LLM chỉ ĐỌC mốc thời gian từ CV (`start_date`, `end_date`, `is_current` trong ExtractedCV);
module này tính tổng số năm. Lý do: LLM không biết hôm nay là ngày nào và tính ngày tháng
kém (thăm dò trên Kaggle: "2019–2023, 2023–nay" bị tính thành "hơn 4 năm").

`today` luôn truyền được từ ngoài vào — kết quả trích xuất lưu DB không chứa con số "đến nay"
cố định; bước chấm điểm tính lại theo ngày chấm.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime
from typing import Iterable, Protocol
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

# [GIẢI THÍCH] Các cách ghi "đến nay" trong CV -> được hiểu là ngày hôm nay.
_PRESENT = {
    "present", "now", "current", "currently", "today", "ongoing", "to date", "to present", "till now",
    "hiện tại", "hiện nay", "nay", "đến nay", "tới nay", "đến hiện tại", "tới hiện tại", "bây giờ",
}

_MONTHS_EN = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12,
}

# [GIẢI THÍCH] Các mẫu (regex) nhận dạng định dạng ngày tháng hay gặp trong CV Anh/Việt.
_SEP = r"\s*[/.\-]\s*"
_YEAR_ONLY = re.compile(r"^(\d{4})$")
_YEAR_MONTH = re.compile(rf"^(\d{{4}}){_SEP}(\d{{1,2}})(?:{_SEP}\d{{1,2}})?$")      # 2020-01, 2020.12, 2020/01/15
_MONTH_YEAR = re.compile(rf"^(\d{{1,2}}){_SEP}(\d{{4}})$")                         # 01/2020, 12.2020, 6-2023
_DAY_MONTH_YEAR = re.compile(rf"^(\d{{1,2}}){_SEP}(\d{{1,2}}){_SEP}(\d{{4}})$")    # 15/01/2020 (kiểu Việt Nam)
# tháng 1/2020 · tháng 1 năm 2020 · thg 12, 2020 · t12/2020 · th12/2020
_VI_MONTH = re.compile(r"^(?:tháng|thang|thg|th|t)\s*(\d{1,2})\s*(?:[/.,\-]|năm|nam)?\s*(\d{4})$")
_EN_MONTH_YEAR = re.compile(r"^([a-z]+)\.?,?\s*(\d{4})$")                          # Jan 2020, Dec. 2020, March, 2020


def today_in(timezone: str) -> date:
    return datetime.now(ZoneInfo(timezone)).date()


def _month_ok(m: int) -> bool:
    return 1 <= m <= 12


# [GIẢI THÍCH] Đổi một chuỗi ngày trong CV ("01/2020", "Tháng 1/2020", "Jan 2020", "hiện nay"...)
# thành ngày thật (ngày 1 của tháng). Thử lần lượt từng mẫu; không khớp mẫu nào -> None.
def parse_date(value: str | None, today: date | None = None) -> date | None:
    """Đọc một mốc thời gian trong CV thành ngày (ngày 1 của tháng). Không đọc được → None.

    Hỗ trợ: "2020", "2020-01", "2020.12", "01/2020", "12.2020", "15/01/2020" (ngày/tháng/năm),
    "Jan 2020", "January, 2020", "Dec. 2020", "Tháng 1/2020", "tháng 1 năm 2020", "T12/2020",
    và "Present" / "Hiện tại" / "Hiện nay" / "Đến nay" / "Now"... → `today`.
    """
    if not value:
        return None
    text = " ".join(value.strip().lower().split())
    if not text:
        return None
    if text in _PRESENT:
        return today or date.today()

    if m := _YEAR_ONLY.match(text):
        return date(int(m.group(1)), 1, 1)
    if (m := _YEAR_MONTH.match(text)) and _month_ok(int(m.group(2))):
        return date(int(m.group(1)), int(m.group(2)), 1)
    if (m := _MONTH_YEAR.match(text)) and _month_ok(int(m.group(1))):
        return date(int(m.group(2)), int(m.group(1)), 1)
    if (m := _DAY_MONTH_YEAR.match(text)) and _month_ok(int(m.group(2))):
        return date(int(m.group(3)), int(m.group(2)), 1)
    if (m := _VI_MONTH.match(text)) and _month_ok(int(m.group(1))):
        return date(int(m.group(2)), int(m.group(1)), 1)
    if (m := _EN_MONTH_YEAR.match(text)) and m.group(1) in _MONTHS_EN:
        return date(int(m.group(2)), _MONTHS_EN[m.group(1)], 1)

    logger.debug("Could not parse date: '%s'", value)
    return None


class _Job(Protocol):
    start_date: str | None
    end_date: str | None
    is_current: bool


# [GIẢI THÍCH] TÍNH SỐ NĂM KINH NGHIỆM BẰNG PYTHON (không để AI tự cộng vì AI hay sai).
# Ví dụ 01/2018-12/2020 và 06/2020-12/2022: gộp thành 01/2018-12/2022 = 4,9 năm (không phải 5,4).
# Các bước: đọc ngày bắt đầu/kết thúc -> bỏ công việc thiếu ngày -> chặn ngày tương lai
# -> sắp xếp -> gộp các khoảng chồng lấn -> tổng số ngày / 365.25.
def calculate_years_of_experience(jobs: Iterable[_Job], today: date | None = None) -> float | None:
    """Tổng số năm làm việc từ các mốc thời gian, gộp các khoảng chồng lấn (không đếm trùng).

    - Công việc đang làm (`is_current` hoặc end_date là "hiện tại"...) tính đến `today`.
    - Thiếu ngày bắt đầu, hoặc thiếu ngày kết thúc mà không phải công việc hiện tại → bỏ qua.
    - Ngày kết thúc ở tương lai → chặn ở `today`.
    Không có khoảng hợp lệ nào → None (khác 0: "không biết" chứ không phải "không có kinh nghiệm").
    """
    today = today or date.today()
    ranges: list[tuple[date, date]] = []
    for job in jobs or []:
        start = parse_date(job.start_date, today)
        end = parse_date(job.end_date, today)
        if job.is_current and end is None:
            end = today
        if start is None or end is None:
            continue
        if start > end:
            start, end = end, start
        end = min(end, today)
        if start >= end:
            continue
        ranges.append((start, end))

    if not ranges:
        return None

    # Sắp xếp các khoảng theo ngày bắt đầu, rồi gộp khoảng nào chồng lên khoảng trước đó.
    ranges.sort()
    merged = [ranges[0]]
    for start, end in ranges[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end:
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))

    total_days = sum((end - start).days for start, end in merged)
    return round(total_days / 365.25, 1)
