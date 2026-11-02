"""
JD Extraction Engine — Bước 1 trong docs/DE_XUAT_CHAM_DIEM_CV.md.

Tách JD thành danh sách yêu cầu (ExtractedJD) bằng một lời gọi LLM.
KHÔNG import DB / RabbitMQ để benchmark (chạy trên Kaggle, không có DB) dùng lại được đúng hàm này.
Phần lưu DB và dùng lại nằm ở app/services/jd_extraction_store.py.
"""

from __future__ import annotations

import hashlib

from app.core.llm_client import LLMManager, LLMUsage, get_llm_manager
from app.schemas.jd_extraction import ExtractedJD
from app.services.prompts.jd_extraction import build_jd_extraction_prompt
from app.services.scoring.prompt import JobInfo


# [GIẢI THÍCH] "Dấu vân tay" của nội dung JD: sha256 của JD đã chuẩn hóa khoảng trắng.
# Chỉ khác dấu cách / xuống dòng -> cùng mã (không tốn thêm lượt gọi AI); đổi chữ -> mã khác -> trích xuất lại.
def jd_content_hash(job: JobInfo) -> str:
    normalized = " ".join(job.as_text().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


# [GIẢI THÍCH] GỌI GEMINI: bắt AI trả JSON đúng khuôn ExtractedJD (lớp kiểm soát: response_schema + Pydantic).
# Lỗi sau khi đã thử lại -> LLMError (nơi gọi quyết định lưu FAILED hay báo lỗi).
async def extract_jd(job: JobInfo, manager: LLMManager | None = None) -> tuple[ExtractedJD, LLMUsage]:
    """Tách JD thành danh sách yêu cầu có cấu trúc.

    Raises:
        LLMError: nếu LLM lỗi sau mọi lần thử lại.
    """
    prompt = build_jd_extraction_prompt(job.as_text())
    manager = manager or get_llm_manager()
    return await manager.generate_structured(prompt, ExtractedJD)
