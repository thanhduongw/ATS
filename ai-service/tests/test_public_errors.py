"""Câu báo lỗi AI cho người dùng: tiếng Việt, không chép lỗi gốc của Gemini / thư viện đọc file."""

from app.core.public_errors import LLM_EXTRACTION_FAILED, extraction_error_message, is_ai_overload

GEMINI_503 = (
    "Gemini call failed: 503 UNAVAILABLE. {'error': {'code': 503, 'message': 'This model is currently "
    "experiencing high demand. Spikes in demand are usually temporary. Please try again later.', "
    "'status': 'UNAVAILABLE'}}"
)


def test_overload_markers():
    assert is_ai_overload(GEMINI_503)
    assert is_ai_overload("429 RESOURCE_EXHAUSTED: quota exceeded")
    assert not is_ai_overload("Output validation failed: missing field 'skills'")
    assert not is_ai_overload(None)


def test_overload_message_is_vietnamese_without_raw_error():
    message = extraction_error_message(LLM_EXTRACTION_FAILED, GEMINI_503)
    assert message.startswith("Không trích xuất được CV")
    assert "quá tải" in message
    for raw in ("503", "Gemini", "UNAVAILABLE", "{"):
        assert raw not in message


def test_other_llm_failure():
    message = extraction_error_message(LLM_EXTRACTION_FAILED, "Output validation failed: missing field 'skills'")
    assert "không hợp lệ" in message and "validation" not in message


def test_unreadable_file():
    message = extraction_error_message("FILE_CORRUPT", "File appears corrupt or unreadable: EOF marker not found")
    assert "không đọc được nội dung file" in message and "corrupt" not in message
    assert "không đọc được nội dung file" in extraction_error_message(None, None)
