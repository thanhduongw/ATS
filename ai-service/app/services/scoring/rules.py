"""
Quy tắc chấm bằng code — Bước 3 (phần code) và Bước 4 (phần code) trong docs/DE_XUAT_CHAM_DIEM_CV.md.

- Số năm kinh nghiệm: đổi ra 11 khoảng O*NET rồi so với khoảng của số năm JD yêu cầu -> mức 0–4.
- Học vấn: đổi tên bằng ra bậc Khung trình độ quốc gia Việt Nam (Quyết định 39/2026/QĐ-TTg) rồi so bậc;
  kết hợp độ phù hợp ngành (LLM xét) và chứng chỉ -> mức 0–4.
- Kiểm tra yêu cầu bắt buộc về số năm và bậc học: Đạt / Không đạt / Không xác định được.
- Lập danh sách yêu cầu cần Gemini kiểm tra (kỹ năng, chứng chỉ, lĩnh vực).

Python thuần, tất định: không gọi LLM, không import DB — kết quả lặp lại được và giải thích được ("Nguyên tắc chung").
Các tên công khai trong file này là giao diện cố định cho phần 4, 5 — không đổi tên.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date

from app.schemas.jd_extraction import ExtractedJD, Importance
from app.schemas.scoring import RequirementCategory, RequirementStatus
from app.schemas.scoring_llm import FieldMatch
from app.services.experience import _PRESENT, parse_date


# ============================================================
# Số năm kinh nghiệm — 11 khoảng O*NET
# ============================================================

_MONTH = 1 / 12
_EPS = 1e-9  # sai số số thực: 1/12 năm tính ra từ ngày tháng vẫn rơi đúng vào khoảng "đến 1 tháng"

# [GIẢI THÍCH] 11 khoảng kinh nghiệm liên quan của O*NET (Education, Training, and Experience Categories).
# Mỗi khoảng: (số thứ tự, cận trên tính bằng năm — gồm cả cận trên; None = không có cận trên, nhãn tiếng Việt).
# Khoảng 1 = đúng 0 năm; các khoảng sau là nửa khoảng (cận dưới, cận trên]. 1 tháng = 1/12 năm.
ONET_EXPERIENCE_BANDS: list[tuple[int, float | None, str]] = [
    (1, 0.0, "Không có"),
    (2, 1 * _MONTH, "Đến 1 tháng"),
    (3, 3 * _MONTH, "1–3 tháng"),
    (4, 6 * _MONTH, "3–6 tháng"),
    (5, 1.0, "6 tháng–1 năm"),
    (6, 2.0, "1–2 năm"),
    (7, 4.0, "2–4 năm"),
    (8, 6.0, "4–6 năm"),
    (9, 8.0, "6–8 năm"),
    (10, 10.0, "8–10 năm"),
    (11, None, "Trên 10 năm"),
]

_BAND_LABELS: dict[int, str] = {band: label for band, _, label in ONET_EXPERIENCE_BANDS}


# [GIẢI THÍCH] Đổi số năm ra số thứ tự khoảng O*NET (1..11). Đúng cận trên thì thuộc khoảng đó
# (đúng 1 năm -> khoảng 5 "6 tháng–1 năm"; đúng 10 năm -> khoảng 10). Số âm coi như 0.
def onet_band(years: float) -> int:
    for band, upper, _ in ONET_EXPERIENCE_BANDS:
        if upper is None or years <= upper + _EPS:
            return band
    return ONET_EXPERIENCE_BANDS[-1][0]


def _fmt_years(years: float) -> str:
    """2.5 -> "2,5 năm"; 3.0 -> "3 năm" (dấu phẩy thập phân kiểu Việt Nam)."""
    text = f"{round(years, 1):g}".replace(".", ",")
    return f"{text} năm"


# [GIẢI THÍCH] Kết quả một quy tắc: mức 0–4 (None = không xác định được vì CV thiếu thông tin),
# dẫn chứng (dữ kiện code đã dùng) và lý do tiếng Việt — đưa thẳng vào ScoredDimension.
@dataclass(frozen=True)
class RuleOutcome:
    level: int | None
    evidence: str
    reason: str


# [GIẢI THÍCH] MỨC TIÊU CHÍ SỐ NĂM KINH NGHIỆM (bảng "Số năm kinh nghiệm" ở Bước 3), N = số năm JD yêu cầu:
#   0: không có kinh nghiệm trong khi JD yêu cầu có
#   1: ít hơn N và thấp hơn khoảng của N từ 2 khoảng trở lên
#   2: ít hơn N, cùng khoảng hoặc thấp hơn 1 khoảng
#   3: từ N năm trở lên, chưa cao hơn khoảng của N quá 1 khoảng
#   4: cao hơn khoảng của N từ 2 khoảng trở lên
# Ví dụ docs (N = 3, khoảng 2–4 năm): 2,5 năm -> 2; 1 năm -> 1; 5 năm -> 3; 7 năm -> 4. N = 0 -> luôn mức 3.
# Cách so khoảng là quy ước của nhóm (bảng "Các phần là quy ước của nhóm" trong docs).
def seniority_outcome(candidate_years: float | None, required_years: float | None) -> RuleOutcome | None:
    """None = tiêu chí không áp dụng (JD không ghi số năm)."""
    if required_years is None:
        return None
    req_band = onet_band(required_years)
    req_text = f"JD yêu cầu {_fmt_years(required_years)} (khoảng {_BAND_LABELS[req_band]})"

    # [GIẢI THÍCH] JD ghi "0 năm" = không đòi kinh nghiệm: ai cũng đạt, kể cả CV không có mốc thời gian.
    # Xét TRƯỚC trường hợp thiếu dữ liệu để không đẩy oan hồ sơ vào "Chưa phân loại".
    if required_years == 0:
        cand = "không tính được" if candidate_years is None else _fmt_years(candidate_years)
        return RuleOutcome(3, f"Ứng viên: {cand}; {req_text}", "JD không yêu cầu kinh nghiệm tối thiểu.")

    if candidate_years is None:
        return RuleOutcome(None, f"CV không có mốc thời gian làm việc để tính; {req_text}",
                           "Không tính được số năm kinh nghiệm vì CV không ghi mốc thời gian làm việc.")

    cand_band = onet_band(candidate_years)
    evidence = f"{_fmt_years(candidate_years)} (khoảng O*NET {_BAND_LABELS[cand_band]}); {req_text}"

    if candidate_years <= 0:
        return RuleOutcome(0, evidence, "Ứng viên chưa có kinh nghiệm làm việc trong khi JD yêu cầu có.")
    if candidate_years < required_years:
        gap = req_band - cand_band
        if gap >= 2:
            return RuleOutcome(1, evidence, f"Ít hơn số năm JD yêu cầu và thấp hơn {gap} khoảng kinh nghiệm.")
        return RuleOutcome(2, evidence, "Ít hơn số năm JD yêu cầu nhưng cùng khoảng hoặc chỉ thấp hơn 1 khoảng.")
    gap = cand_band - req_band
    if gap >= 2:
        return RuleOutcome(4, evidence, f"Vượt số năm JD yêu cầu, cao hơn {gap} khoảng kinh nghiệm.")
    return RuleOutcome(3, evidence, "Đủ số năm JD yêu cầu.")


# ============================================================
# Học vấn — bậc Khung trình độ quốc gia Việt Nam
# ============================================================

# [GIẢI THÍCH] Tên bậc theo Khung trình độ quốc gia Việt Nam (Quyết định 39/2026/QĐ-TTg, thay Quyết định 1982/QĐ-TTg):
# sơ cấp bậc 2, trung cấp bậc 4, cao đẳng bậc 5, đại học bậc 6, thạc sĩ bậc 7, tiến sĩ bậc 8.
DEGREE_LEVEL_LABELS: dict[int, str] = {
    2: "Sơ cấp",
    4: "Trung cấp",
    5: "Cao đẳng",
    6: "Đại học",
    7: "Thạc sĩ",
    8: "Tiến sĩ",
}

# [GIẢI THÍCH] Từ khóa nhận ra bậc, viết KHÔNG DẤU, chữ thường (so trên chuỗi đã bỏ dấu).
# Xét từ bậc cao xuống thấp, gặp bậc nào trước thì lấy bậc đó ("Thạc sĩ" không bị nhận nhầm thành "đại học").
# Bằng nước ngoài quy đổi tương ứng: bachelor -> 6, master -> 7, PhD -> 8 — quy đổi này là quy ước của nhóm
# (nêu trong phần hạn chế, docs mục "Các phần là quy ước của nhóm").
# "Sau đại học" / postgraduate nằm ở bậc 7 và xét TRƯỚC mẫu "đại học" (bậc 6) để không bị nhận nhầm.
# KHÔNG nhận "BA" không dấu chấm: dễ nhầm với Business Analyst (chức danh rất hay gặp trong CV/JD ngành IT);
# chỉ nhận dạng có dấu chấm "B.A.".
_DEGREE_PATTERNS: list[tuple[int, re.Pattern]] = [
    (8, re.compile(r"tien si|\bph\.?\s?d\b|\bdoctor")),
    (7, re.compile(r"thac si|sau dai hoc|\bpost-?\s?graduate|\bmaster|\bmba\b|\bm\.?sc\b|\bm\.?eng\b")),
    (6, re.compile(r"dai hoc|cu nhan|ky su|\bbachelor|\bb\.?sc\b|\bb\.a\b|\bb\.e\b|\bb\.?eng\b"
                   r"|engineer'?s degree|university degree")),
    (5, re.compile(r"cao dang|\bcollege\b|\bassociate")),
    (4, re.compile(r"trung cap|\bvocational")),
    (2, re.compile(r"so cap")),
]


# [GIẢI THÍCH] Bỏ dấu tiếng Việt để "Đại học", "dai hoc", "ĐẠI HỌC" so như nhau (viết lại theo profile.py).
def _strip_accents(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn").replace("đ", "d").replace("Đ", "D")


# [GIẢI THÍCH] Đổi tên bằng (CV hoặc JD, Việt hoặc Anh) ra bậc Khung trình độ quốc gia; không nhận ra -> None
# (không đoán). Chuỗi nhắc nhiều bậc thì lấy bậc CAO NHẤT — dùng cho CV; JD dùng min_degree_level.
def degree_level(text: str | None) -> int | None:
    levels = _mentioned_levels(text)
    return max(levels) if levels else None


# [GIẢI THÍCH] Bậc THẤP NHẤT được nhắc trong chuỗi — dùng cho JD. JD ghi nhiều bậc ("Đại học hoặc Cao đẳng",
# "Cao đẳng trở lên") nghĩa là chấp nhận bậc thấp nhất; ngược lại CV ghi nhiều bậc thì lấy bậc cao nhất ứng viên
# đạt (degree_level). Không nhận ra bậc nào -> None.
def min_degree_level(text: str | None) -> int | None:
    levels = _mentioned_levels(text)
    return min(levels) if levels else None


# [GIẢI THÍCH] Mọi bậc được nhắc trong chuỗi. Xét từ bậc cao xuống thấp; đoạn đã khớp bị xóa trước khi xét bậc thấp hơn,
# để "Sau đại học" chỉ tính bậc 7 (không tính thêm "đại học" bậc 6 nằm bên trong).
def _mentioned_levels(text: str | None) -> list[int]:
    if not text or not text.strip():
        return []
    remaining = _strip_accents(text).lower()
    levels: list[int] = []
    for level, pattern in _DEGREE_PATTERNS:
        if pattern.search(remaining):
            levels.append(level)
            remaining = pattern.sub(" ", remaining)
    return levels


# [GIẢI THÍCH] Bậc cao nhất ứng viên đạt, xét các mục học vấn trong CV (chỉ khóa "degree" —
# ngành học không cho biết bậc). Không mục nào nhận ra -> None.
def highest_degree_level(education: list[dict]) -> int | None:
    levels = [degree_level((e or {}).get("degree")) for e in education or []]
    known = [lv for lv in levels if lv is not None]
    return max(known) if known else None


# [GIẢI THÍCH] Suy bậc từ TÊN TRƯỜNG khi CV không ghi bằng (nhiều CV Việt Nam chỉ ghi "Đại học Bách Khoa TP.HCM, 2016–2020").
# QUY ƯỚC của nhóm (docs mục "Các phần là quy ước của nhóm"): tên trường chỉ cho biết bậc tối thiểu hợp lý —
# Đại học / Học viện / University -> bậc 6; Cao đẳng / College -> bậc 5 — và CHỈ áp dụng khi chắc là đã học xong.
_INSTITUTION_PATTERNS: list[tuple[int, re.Pattern]] = [
    (6, re.compile(r"dai hoc|hoc vien|\buniversity\b")),
    (5, re.compile(r"cao dang|\bcollege\b")),
]

# [GIẢI THÍCH] Thời gian chuẩn của chương trình đại học: mục không ghi ngày kết thúc chỉ coi là đã học xong
# khi đã bắt đầu từ 4 năm trở lên.
_STANDARD_STUDY_YEARS = 4


def _institution_level(institution: str | None) -> int | None:
    if not institution or not institution.strip():
        return None
    normalized = _strip_accents(institution).lower()
    for level, pattern in _INSTITUTION_PATTERNS:
        if pattern.search(normalized):
            return level
    return None


# [GIẢI THÍCH] Đã học xong chưa — chỉ khi chắc chắn:
# - end_date là chữ "đến nay" / "hiện tại" -> đang học. Kiểm tra bằng _PRESENT TRƯỚC khi gọi parse_date,
#   vì parse_date đổi các chữ này thành ngày hôm nay (sẽ bị hiểu nhầm là "đã xong hôm nay").
# - end_date đọc được và không ở tương lai -> đã xong; ở tương lai -> chưa.
# - end_date trống: đã xong nếu start_date đọc được và cách hôm nay ít nhất 4 năm; còn lại -> không chắc.
def _finished_study(entry: dict, today: date) -> bool:
    end_text = entry.get("end_date")
    if end_text and end_text.strip():
        if " ".join(end_text.strip().lower().split()) in _PRESENT:
            return False
        end = parse_date(end_text, today)
        return end is not None and end <= today
    start = parse_date(entry.get("start_date"), today)
    if start is None:
        return False
    return date(start.year + _STANDARD_STUDY_YEARS, start.month, 1) <= today


# [GIẢI THÍCH] Chắc chắn ĐANG HỌC: end_date là chữ "đến nay" / "hiện tại" (_PRESENT, kiểm tra trước parse_date),
# hoặc end_date đọc được và ở sau hôm nay. end_date trống hoặc không đọc được -> KHÔNG coi là đang học
# (không đủ căn cứ; mục có ghi tên bằng vẫn được tính như cũ).
def _still_studying(entry: dict, today: date) -> bool:
    end_text = entry.get("end_date")
    if not end_text or not end_text.strip():
        return False
    if " ".join(end_text.strip().lower().split()) in _PRESENT:
        return True
    end = parse_date(end_text, today)
    return end is not None and end > today


# [GIẢI THÍCH] BẬC HỌC CỦA ỨNG VIÊN dùng khi chấm: bậc cao nhất trong các mục học vấn.
# - Mục ĐANG HỌC (đến nay / năm kết thúc ở tương lai) -> bỏ qua, kể cả khi có ghi tên bằng: chưa có bằng thì
#   không được tính bậc (yêu cầu "Tốt nghiệp đại học" không thể Đạt nhờ một bằng đang học).
# - Mục có tên bằng nhận ra được -> dùng bậc của bằng.
# - Mục không có / không nhận ra tên bằng -> suy từ tên trường (quy ước ở trên), chỉ khi đã học xong.
# Trả (bậc, ghi chú). Ghi chú "suy từ tên trường: <tên trường>" khi bậc cao nhất là bậc suy ra, để HR biết
# bậc này không do CV ghi trực tiếp. highest_degree_level giữ nguyên (chỉ đọc tên bằng).
def candidate_degree_level(education: list[dict], today: date) -> tuple[int | None, str | None]:
    best_level: int | None = None
    best_note: str | None = None
    for entry in education or []:
        entry = entry or {}
        if _still_studying(entry, today):
            continue
        level = degree_level(entry.get("degree"))
        note = None
        if level is None and _finished_study(entry, today):
            level = _institution_level(entry.get("institution"))
            if level is not None:
                note = f"suy từ tên trường: {entry.get('institution').strip()}"
        if level is None:
            continue
        # Cùng bậc thì ưu tiên mục ghi bằng trực tiếp (không ghi chú).
        if best_level is None or level > best_level or (level == best_level and note is None):
            best_level, best_note = level, note
    return best_level, best_note


def _degree_text(level: int | None) -> str:
    return f"{DEGREE_LEVEL_LABELS.get(level, 'Bậc')} (bậc {level})" if level is not None else "không xác định"


# ============================================================
# Công cụ / công nghệ / chứng chỉ có tên — kiểm tra bằng so khớp chữ
# ============================================================

# [GIẢI THÍCH] Chuẩn hóa để so tên công cụ: chữ thường, bỏ dấu, bỏ dấu chấm, gộp khoảng trắng, bỏ hậu tố "js" dính liền
# ("React.js" -> "reactjs" -> "react"). GIỮ "#" và "+" vì C#, C++ khác C.
_JS_SUFFIX = re.compile(r"(?<=[a-z0-9])js\b")


def _normalize_name(text: str) -> str:
    text = _strip_accents(text).lower().replace(".", "")
    text = " ".join(text.split())
    return _JS_SUFFIX.sub("", text).strip()


def _contains_name(haystack: str, needle: str) -> bool:
    """Khớp NGUYÊN CỤM theo ranh giới từ: "java" không khớp "javascript", "c" không khớp "css" hay "c#"."""
    if not needle:
        return False
    pattern = r"(?<![a-z0-9#+])" + re.escape(needle) + r"(?![a-z0-9#+])"
    return re.search(pattern, haystack) is not None


# [GIẢI THÍCH] Tìm một công cụ / công nghệ / chứng chỉ CÓ TÊN trong các phần nghề nghiệp của hồ sơ chấm mù:
# danh sách kỹ năng, công nghệ của từng công việc và dự án, tên chứng chỉ. KHÔNG tìm trong phần tóm tắt / mục tiêu
# (câu "mong muốn học React" không phải bằng chứng có React). Trả đoạn chữ gốc chứa tên đó, hoặc None.
# Việc CV có ghi một tên hay không kiểm tra được bằng chữ -> kết quả lặp lại được, không phụ thuộc AI (docs Bước 4).
# Chỉ dùng cho tên riêng; kiến thức nền (OOP, cấu trúc dữ liệu...) vẫn để AI đánh giá.
def find_named_item(requirement: str, profile: dict) -> str | None:
    needle = _normalize_name(requirement or "")
    if not needle or not profile:
        return None

    candidates: list[tuple[str, list[str]]] = []
    if profile.get("skills"):
        candidates.append(("Kỹ năng", list(profile["skills"])))
    for job in profile.get("work_experience") or []:
        if job.get("technologies"):
            where = " — ".join(x for x in (job.get("title"), job.get("company")) if x)
            candidates.append((f"Công nghệ ({where})" if where else "Công nghệ", list(job["technologies"])))
    for project in profile.get("projects") or []:
        if project.get("technologies"):
            name = project.get("name")
            candidates.append((f"Dự án {name}" if name else "Dự án", list(project["technologies"])))
    certs = [c.get("name") for c in profile.get("certifications") or [] if c.get("name")]
    if certs:
        candidates.append(("Chứng chỉ", certs))

    for label, items in candidates:
        if any(_contains_name(_normalize_name(str(item)), needle) for item in items):
            return f"{label}: {', '.join(str(i) for i in items)}"
    return None


# ============================================================
# Danh sách yêu cầu cần Gemini kiểm tra
# ============================================================

# [GIẢI THÍCH] Một yêu cầu Gemini phải kiểm tra trong hồ sơ (Bước 4: kỹ năng, chứng chỉ, lĩnh vực do LLM kiểm tra).
@dataclass(frozen=True)
class CheckItem:
    name: str
    category: RequirementCategory
    importance: Importance


# [GIẢI THÍCH] Lập danh sách yêu cầu cần kiểm tra (items_to_check):
# - mọi kỹ năng, chứng chỉ, lĩnh vực BẮT BUỘC (Bước 4 — "cửa" phải qua);
# - thêm chứng chỉ ƯU TIÊN, vì có chứng chỉ ưu tiên là điều kiện lên mức 4 của tiêu chí Học vấn (Bước 3).
# Bỏ trùng tên (không phân biệt hoa thường), giữ thứ tự xuất hiện: kỹ năng -> chứng chỉ -> lĩnh vực.
# Trùng tên mà một bản BẮT BUỘC thì giữ là BẮT BUỘC (không để bản ưu tiên che mất yêu cầu bắt buộc).
def items_to_check(jd: ExtractedJD) -> list[CheckItem]:
    candidates: list[CheckItem] = []
    for item in jd.skills:
        if item.importance == Importance.REQUIRED:
            candidates.append(CheckItem(item.name, RequirementCategory.SKILL, item.importance))
    for item in jd.certifications:
        candidates.append(CheckItem(item.name, RequirementCategory.CERTIFICATION, item.importance))
    for item in jd.domains:
        if item.importance == Importance.REQUIRED:
            candidates.append(CheckItem(item.name, RequirementCategory.DOMAIN, item.importance))

    result: list[CheckItem] = []
    index: dict[str, int] = {}
    for item in candidates:
        key = item.name.strip().casefold()
        if not key:
            continue
        if key not in index:
            index[key] = len(result)
            result.append(item)
        elif item.importance == Importance.REQUIRED and result[index[key]].importance != Importance.REQUIRED:
            old = result[index[key]]
            result[index[key]] = CheckItem(old.name, old.category, Importance.REQUIRED)
    return result


# ============================================================
# Mức tiêu chí Học vấn và chứng chỉ
# ============================================================

_FIELD_MATCH_TEXT: dict[FieldMatch, str] = {
    FieldMatch.EXACT: "đúng ngành",
    FieldMatch.RELATED: "ngành gần",
    FieldMatch.UNRELATED: "ngành không liên quan",
    FieldMatch.UNKNOWN: "CV không ghi ngành",
}


# [GIẢI THÍCH] MỨC TIÊU CHÍ HỌC VẤN VÀ CHỨNG CHỈ (bảng "Học vấn và chứng chỉ" ở Bước 3).
# Code so bậc; độ phù hợp ngành (field_match) do LLM xét; trạng thái chứng chỉ lấy từ kết quả kiểm tra yêu cầu.
#   0: thấp hơn bậc JD yêu cầu từ 2 bậc trở lên
#   1: thấp hơn 1 bậc; hoặc đủ bậc nhưng ngành không liên quan
#   2: đủ bậc, ngành gần (hoặc CV không ghi ngành khi JD giới hạn ngành); hoặc thiếu chứng chỉ bắt buộc
#   3: đủ bậc, đúng ngành (hoặc JD không giới hạn ngành), đủ chứng chỉ bắt buộc
#   4: đạt mức 3 và (cao hơn bậc yêu cầu hoặc có chứng chỉ ưu tiên)
# "Thấp hơn 1 bậc" so theo SỐ BẬC của Khung (cao đẳng 5 vs đại học 6), không theo thứ tự tên bằng.
# CV không nhận ra bằng mà JD có yêu cầu bậc -> None (không xác định được), không coi là 0.
def education_outcome(
    candidate_level: int | None,
    required_level: int | None,
    field_match: FieldMatch | None,
    fields_restricted: bool,
    required_certs_met: bool | None,
    preferred_cert_met: bool,
) -> RuleOutcome:
    parts = [f"Ứng viên: {_degree_text(candidate_level)}"]
    if required_level is not None:
        parts.append(f"JD yêu cầu: {_degree_text(required_level)}")
    if fields_restricted:
        parts.append(f"Ngành: {_FIELD_MATCH_TEXT.get(field_match, 'chưa đánh giá')}")
    if required_certs_met is not None:
        parts.append("Chứng chỉ bắt buộc: " + ("đủ" if required_certs_met else "thiếu"))
    if preferred_cert_met:
        parts.append("Có chứng chỉ ưu tiên")
    evidence = "; ".join(parts)

    # Phần bậc học
    if required_level is not None:
        if candidate_level is None:
            return RuleOutcome(None, evidence, "Không xác định được bậc học vì CV không ghi rõ văn bằng.")
        if candidate_level <= required_level - 2:
            return RuleOutcome(0, evidence, "Bậc học thấp hơn JD yêu cầu từ 2 bậc trở lên.")
        if candidate_level == required_level - 1:
            return RuleOutcome(1, evidence, "Bậc học thấp hơn JD yêu cầu 1 bậc.")

    # Đủ bậc (hoặc JD không yêu cầu bậc): xét ngành — chỉ khi JD giới hạn ngành (docs: "hoặc JD không giới hạn ngành").
    if fields_restricted:
        if field_match == FieldMatch.UNRELATED:
            return RuleOutcome(1, evidence, "Đủ bậc học nhưng ngành học không liên quan tới ngành JD yêu cầu.")
        if field_match == FieldMatch.RELATED:
            return RuleOutcome(2, evidence, "Đủ bậc học, ngành gần nhưng không đúng ngành JD yêu cầu.")
        if field_match in (FieldMatch.UNKNOWN, None):
            return RuleOutcome(2, evidence, "Đủ bậc học nhưng CV không ghi ngành học để đối chiếu.")
    if required_certs_met is False:
        return RuleOutcome(2, evidence, "Đủ bậc học và ngành nhưng thiếu chứng chỉ JD ghi là bắt buộc.")

    higher = required_level is not None and candidate_level is not None and candidate_level > required_level
    if higher or preferred_cert_met:
        why = "bậc học cao hơn yêu cầu" if higher else "có thêm chứng chỉ JD ghi là ưu tiên"
        return RuleOutcome(4, evidence, f"Đáp ứng yêu cầu học vấn và {why}.")
    return RuleOutcome(3, evidence, "Đáp ứng yêu cầu học vấn (bậc, ngành, chứng chỉ bắt buộc).")


# ============================================================
# Kiểm tra yêu cầu bắt buộc bằng code (Bước 4)
# ============================================================

# [GIẢI THÍCH] Yêu cầu bắt buộc về số năm: so trực tiếp với N (không qua khoảng — "cửa" là con số JD ghi).
# CV không tính được số năm -> Không xác định được (dẫn tới Chưa phân loại ở Bước 6, để HR xem tay).
# JD không yêu cầu (None hoặc 0 năm) -> Đạt, xét trước khi xem CV có số năm hay không.
def check_years_requirement(candidate_years: float | None, required_years: float | None) -> RequirementStatus:
    if required_years is None or required_years == 0:
        return RequirementStatus.MET
    if candidate_years is None:
        return RequirementStatus.UNKNOWN
    return RequirementStatus.MET if candidate_years >= required_years else RequirementStatus.UNMET


# [GIẢI THÍCH] Yêu cầu bắt buộc về bậc học: so số bậc Khung trình độ quốc gia. CV không nhận ra bằng -> Không xác định được.
def check_education_requirement(candidate_level: int | None, required_level: int | None) -> RequirementStatus:
    if required_level is None:
        return RequirementStatus.MET
    if candidate_level is None:
        return RequirementStatus.UNKNOWN
    return RequirementStatus.MET if candidate_level >= required_level else RequirementStatus.UNMET
