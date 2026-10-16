"""
Trích xuất CV một lần, lưu DB, dùng lại (bảng `cv_extractions`).

- Khoá: sha256 nội dung file + phiên bản prompt trích xuất. Cùng một CV nộp vào nhiều tin chỉ gọi
  LLM một lần; đổi prompt (tăng PROMPT_VERSION) thì trích xuất lại.
- Tra nhanh theo `resume_url` để khỏi tải file từ S3 mỗi lần mở hồ sơ.
- Ghi bằng INSERT ... ON CONFLICT nên hai yêu cầu đồng thời cho cùng file không làm lỗi unique.
- Lần trước FAILED thì lần sau thử lại (không trả mãi kết quả lỗi).
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.llm_client import LLMError, LLMManager
from app.core.s3_client import get_s3_client
from app.models import CVExtraction
from app.schemas.cv_extraction import CVExtractionResponse, CVExtractionResult, ExtractionProvenance
from app.services.cv_extraction_engine import extract_cv_from_text
from app.services.extraction_pipeline import extract_text_from_bytes
from app.services.prompts.cv_extraction import PROMPT_VERSION

logger = logging.getLogger(__name__)

COMPLETED = "COMPLETED"
FAILED = "FAILED"


class CVUnavailableError(Exception):
    """Không tải được file CV (URL ngoài bucket, file không tồn tại, lỗi S3...)."""


# [GIẢI THÍCH] "Dấu vân tay" của nội dung file: hai file giống hệt nhau luôn có cùng mã.
def file_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# [GIẢI THÍCH] Tìm bản trích xuất đã lưu theo LINK CV (và đúng phiên bản prompt hiện tại).
async def find_by_resume_url(session: AsyncSession, resume_url: str) -> CVExtraction | None:
    """Bản trích xuất mới nhất của URL này với prompt hiện tại (kể cả FAILED)."""
    stmt = (
        select(CVExtraction)
        .where(CVExtraction.resume_url == resume_url, CVExtraction.prompt_version == PROMPT_VERSION)
        .order_by(CVExtraction.updated_at.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


# [GIẢI THÍCH] Tìm bản trích xuất theo NỘI DUNG file: cùng một CV nằm ở link khác vẫn dùng lại được.
async def _find_by_hash(session: AsyncSession, file_hash: str) -> CVExtraction | None:
    stmt = select(CVExtraction).where(
        CVExtraction.file_hash == file_hash, CVExtraction.prompt_version == PROMPT_VERSION)
    return (await session.execute(stmt)).scalar_one_or_none()


# [GIẢI THÍCH] Lưu bản trích xuất: chưa có thì thêm, có rồi (cùng file + cùng phiên bản prompt) thì cập nhật.
async def _upsert(session: AsyncSession, values: dict) -> CVExtraction:
    values = {**values, "prompt_version": PROMPT_VERSION, "updated_at": datetime.utcnow()}
    stmt = insert(CVExtraction).values(**values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_cv_extractions_file_prompt",
        set_={k: stmt.excluded[k] for k in values if k not in ("file_hash", "prompt_version")},
    ).returning(CVExtraction.id)
    row_id = (await session.execute(stmt)).scalar_one()
    await session.commit()
    row = await session.get(CVExtraction, row_id, populate_existing=True)
    return row


# [GIẢI THÍCH] Tải file CV từ AWS S3. Link ngoài bucket cho phép / file không tồn tại / lỗi mạng
# -> ném CVUnavailableError (sẽ thành lý do FAILED cho HR).
async def _download(resume_url: str) -> tuple[bytes, str]:
    s3 = get_s3_client()
    try:
        key = s3.key_from_url(resume_url)
        data = await asyncio.get_running_loop().run_in_executor(None, s3.download, key)
    except (ValueError, FileNotFoundError) as exc:
        raise CVUnavailableError(str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — lỗi mạng / quyền S3
        raise CVUnavailableError(f"Không tải được CV từ S3: {exc}") from exc
    return data, key.rsplit("/", 1)[-1]


# [GIẢI THÍCH] TRÍCH XUẤT MỘT LẦN, DÙNG LẠI NHIỀU LẦN.
# 1. Tìm theo link CV -> có bản thành công thì trả về luôn (không gọi AI).
# 2. Chưa có -> tải file từ S3, tính mã băm -> tìm theo mã băm -> có thì trả về.
# 3. Vẫn chưa có -> đọc chữ trong file (ảnh thì OCR) -> gọi Gemini (LLM lần 1) -> lưu DB.
# force=True khi HR bấm "Phân tích lại": bỏ qua bản cũ.
# Mọi nhánh lỗi đều lưu FAILED kèm lý do; lần sau gọi lại sẽ tự thử lại.
async def get_or_extract(
    session_factory: async_sessionmaker[AsyncSession],
    resume_url: str,
    candidate_id: int | None = None,
    *,
    force: bool = False,
    manager: LLMManager | None = None,
    cv_bytes: bytes | None = None,
) -> CVExtraction:
    """Trả bản trích xuất COMPLETED có sẵn, hoặc trích xuất mới (lưu cả khi FAILED).

    Args:
        force: bỏ qua bản có sẵn, trích xuất lại (HR bấm "Phân tích lại").
        cv_bytes: đã có nội dung file thì khỏi tải lại từ S3.

    Raises:
        CVUnavailableError: không tải được file CV — không có gì để lưu.
    """
    async with session_factory() as session:
        if not force:
            row = await find_by_resume_url(session, resume_url)
            if row is not None and row.status == COMPLETED:
                return row

        if cv_bytes is None:
            cv_bytes, filename = await _download(resume_url)
        else:
            filename = resume_url.rsplit("/", 1)[-1]
        file_hash = file_sha256(cv_bytes)

        if not force:
            row = await _find_by_hash(session, file_hash)
            if row is not None and row.status == COMPLETED:
                return row

        base = {"file_hash": file_hash, "resume_url": resume_url, "candidate_id": candidate_id}

        # Đọc chữ trong file: PDF, DOCX; ảnh scan thì dùng PaddleOCR.
        text = await extract_text_from_bytes(cv_bytes, filename)
        text_meta = text.metadata.model_dump(mode="json")
        if text.status != "success" or not text.text:
            logger.warning("Không đọc được nội dung CV %s: %s", resume_url, text.metadata.error_message)
            return await _upsert(session, {
                **base, "status": FAILED, "model": None, "result": None, "provenance": None,
                "text_metadata": text_meta,
                "error_code": text.metadata.error_code or "TEXT_EXTRACTION_FAILED",
                "error_message": text.metadata.error_message or "Không đọc được nội dung file CV",
            })

        try:
            # GỌI GEMINI (LLM lần 1): tách CV thành các trường theo khuôn ExtractedCV.
            result, usage = await extract_cv_from_text(text.text, manager)
        except LLMError as exc:
            logger.error("Trích xuất CV %s thất bại: %s", resume_url, exc)
            return await _upsert(session, {
                **base, "status": FAILED, "model": None, "result": None, "provenance": None,
                "text_metadata": text_meta, "error_code": "FAILED_EXTRACTION", "error_message": str(exc)[:2000],
            })

        provenance = ExtractionProvenance(
            model_used=usage.model, prompt_version=PROMPT_VERSION, fallback_used=usage.fallback_used,
            input_tokens=usage.input_tokens, output_tokens=usage.output_tokens,
            estimated_cost_usd=usage.estimated_cost_usd, processing_time_ms=usage.latency_ms,
            retries=usage.retries,
        )
        return await _upsert(session, {
            **base, "status": COMPLETED, "model": usage.model,
            "result": result.model_dump(mode="json"), "provenance": provenance.model_dump(mode="json"),
            "text_metadata": text_meta, "error_code": None, "error_message": None,
        })


def to_response(row: CVExtraction) -> dict:
    """Dạng trả cho frontend — giữ cấu trúc CVExtractionResponse cũ, thêm id và thời điểm."""
    if row.status == COMPLETED:
        body = CVExtractionResponse(
            status="success",
            result=CVExtractionResult.model_validate(row.result),
            provenance=ExtractionProvenance.model_validate(row.provenance),
        ).model_dump(mode="json")
    else:
        body = CVExtractionResponse(
            status="error",
            provenance=ExtractionProvenance(model_used="none", prompt_version=row.prompt_version),
            error_code=row.error_code,
            error_message=row.error_message,
        ).model_dump(mode="json")
    body["extraction_id"] = row.id
    body["updated_at"] = row.updated_at.isoformat() if row.updated_at else None
    return body
