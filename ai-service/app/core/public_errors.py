"""Câu báo lỗi AI hiện cho người dùng (HR, ứng viên): tiếng Việt, không lộ lỗi gốc.

Lỗi gốc của Gemini / thư viện đọc file là tiếng Anh và có chi tiết kỹ thuật (mã HTTP, JSON trả về), ví dụ
"Gemini call failed: 503 UNAVAILABLE. {'error': {...}}". Chi tiết đó chỉ ghi vào log và các bảng nhật ký
(ai_jobs, cv_facts, jd_facts); giao diện chỉ nhận câu trong file này.
"""

AI_BUSY = "dịch vụ AI đang quá tải hoặc hết hạn mức, vui lòng thử lại sau ít phút"

# Dấu hiệu Gemini quá tải / hết hạn mức trong chuỗi lỗi gốc (so sánh không phân biệt hoa thường).
_OVERLOAD_MARKERS = (
    "503", "unavailable", "overloaded", "high demand", "429", "resource_exhausted", "quota", "rate limit",
)

# Mã lỗi khi bước gọi AI trích xuất thất bại; các mã khác là lỗi đọc nội dung file (file trống, hỏng, sai loại).
LLM_EXTRACTION_FAILED = "FAILED_EXTRACTION"
# Câu trích dẫn của AI không khớp nội dung CV/JD dù đã hỏi lại một lần.
CITATION_MISMATCH = "CITATION_MISMATCH"
# AI trả JSON hợp lệ nhưng sai luật chấm (vd điểm ngoài quy tắc, thiếu dẫn chứng JD).
INVALID_OUTPUT = "INVALID_OUTPUT"

CITATION_MESSAGE = "AI trích dẫn không khớp nội dung CV/JD, vui lòng chấm lại."


def is_ai_overload(detail: str | None) -> bool:
    """Lỗi gốc cho thấy dịch vụ AI quá tải hoặc hết hạn mức (thử lại sau là được)."""
    low = (detail or "").lower()
    return any(marker in low for marker in _OVERLOAD_MARKERS)


def extraction_error_message(error_code: str | None, detail: str | None) -> str:
    """Câu cho người dùng khi AI không trích xuất được CV (dùng cho "AI đọc CV" và cho chấm điểm)."""
    if is_ai_overload(detail):
        return f"Không trích xuất được CV: {AI_BUSY}."
    if error_code == CITATION_MISMATCH:
        return CITATION_MESSAGE
    if error_code in (LLM_EXTRACTION_FAILED, INVALID_OUTPUT):
        return "Không trích xuất được CV: AI trả kết quả không hợp lệ, vui lòng thử lại."
    return "Không trích xuất được CV: không đọc được nội dung file (file trống, hỏng hoặc ảnh không rõ chữ)."
