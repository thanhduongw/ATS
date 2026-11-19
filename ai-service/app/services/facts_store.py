"""Trích xuất dữ kiện CV và JD một lần, lưu DB (bảng `cv_facts`, `jd_facts`), dùng lại.

CV: khoá = sha256 nội dung file + phiên bản prompt. Cùng một CV nộp vào nhiều tin chỉ gọi LLM một lần; tra nhanh theo
`resume_url` để khỏi tải file từ S3 mỗi lần mở hồ sơ. CV được đọc chữ → CHE PII → gửi AI (Gemini không thấy tên, email,
SĐT, địa chỉ…); câu trích được kiểm tra với chính văn bản đã che.
JD: khoá = sha256 nội dung JD (đã chuẩn hoá khoảng trắng) + phiên bản prompt; HR sửa JD thì trích xuất lại.

Ghi bằng INSERT … ON CONFLICT nên hai yêu cầu đồng thời không gây lỗi unique. Lần trước FAILED thì lần sau thử lại.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.llm_client import LLMError, LLMManager
from app.core.public_errors import CITATION_MISMATCH, INVALID_OUTPUT, LLM_EXTRACTION_FAILED
from app.core.s3_client import get_s3_client
from app.models import CVFactsRecord, JDFactsRecord
from app.services.extraction_pipeline import extract_text_from_bytes
from app.services.job_info import JobInfo, jd_content_hash
from app.services.privacy import redact, remaining_contact_indicators
from app.services.prompts.ssrc import (
    EXTRACT_CV_VERSION,
    EXTRACT_JD_VERSION,
    cv_extraction_prompt,
    jd_extraction_prompt,
    sha256_text,
)
from app.services.ssrc_pipeline import CallStats, CitationError, InvalidOutputError, extract_cv_facts, extract_jd_facts

logger = logging.getLogger(__name__)

COMPLETED = "COMPLETED"
FAILED = "FAILED"


class CVUnavailableError(Exception):
    """Không tải được file CV (URL ngoài bucket, file không tồn tại, lỗi S3...)."""


def file_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _provenance(stats: CallStats, version: str, prompt_template: str) -> dict:
    return {
        "model": stats.model, "prompt_version": version, "prompt_hash": sha256_text(prompt_template),
        "input_tokens": stats.input_tokens, "output_tokens": stats.output_tokens,
        "estimated_cost_usd": stats.estimated_cost_usd, "latency_ms": stats.latency_ms,
        "retries": stats.retries, "validation_retries": stats.validation_retries,
    }


def _failure(exc: Exception) -> tuple[str, str]:
    """(mã lỗi lưu DB, chi tiết kỹ thuật)."""
    if isinstance(exc, CitationError):
        return CITATION_MISMATCH, str(exc)[:2000]
    if isinstance(exc, InvalidOutputError):
        return INVALID_OUTPUT, str(exc)[:2000]
    return LLM_EXTRACTION_FAILED, str(exc)[:2000]


# --------------------------------------------------------------------------------------------------------------
# CV
# --------------------------------------------------------------------------------------------------------------

async def find_cv_by_resume_url(session: AsyncSession, resume_url: str) -> CVFactsRecord | None:
    """Bản mới nhất của URL này với prompt hiện tại (kể cả FAILED)."""
    stmt = (select(CVFactsRecord)
            .where(CVFactsRecord.resume_url == resume_url, CVFactsRecord.prompt_version == EXTRACT_CV_VERSION)
            .order_by(CVFactsRecord.updated_at.desc()).limit(1))
    return (await session.execute(stmt)).scalar_one_or_none()


async def _cv_by_hash(session: AsyncSession, file_hash: str) -> CVFactsRecord | None:
    stmt = select(CVFactsRecord).where(
        CVFactsRecord.file_hash == file_hash, CVFactsRecord.prompt_version == EXTRACT_CV_VERSION)
    return (await session.execute(stmt)).scalar_one_or_none()


async def _upsert_cv(session: AsyncSession, values: dict) -> CVFactsRecord:
    values = {**values, "prompt_version": EXTRACT_CV_VERSION, "updated_at": datetime.utcnow()}
    stmt = insert(CVFactsRecord).values(**values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_cv_facts_file_prompt",
        set_={k: stmt.excluded[k] for k in values if k not in ("file_hash", "prompt_version")},
    ).returning(CVFactsRecord.id)
    row_id = (await session.execute(stmt)).scalar_one()
    await session.commit()
    return await session.get(CVFactsRecord, row_id, populate_existing=True)


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


async def get_or_extract_cv(
    session_factory: async_sessionmaker[AsyncSession],
    resume_url: str,
    candidate_id: int | None = None,
    *,
    force: bool = False,
    manager: LLMManager | None = None,
    cv_bytes: bytes | None = None,
) -> CVFactsRecord:
    """Trả dữ kiện CV COMPLETED có sẵn, hoặc trích xuất mới (lưu cả khi FAILED).

    Raises:
        CVUnavailableError: không tải được file CV — không có gì để lưu.
    """
    async with session_factory() as session:
        if not force:
            row = await find_cv_by_resume_url(session, resume_url)
            if row is not None and row.status == COMPLETED:
                return row

        if cv_bytes is None:
            cv_bytes, filename = await _download(resume_url)
        else:
            filename = resume_url.rsplit("/", 1)[-1]
        file_hash = file_sha256(cv_bytes)

        if not force:
            row = await _cv_by_hash(session, file_hash)
            if row is not None and row.status == COMPLETED:
                return row

        base = {"file_hash": file_hash, "resume_url": resume_url, "candidate_id": candidate_id}

        text = await extract_text_from_bytes(cv_bytes, filename)
        text_meta = text.metadata.model_dump(mode="json")
        if text.status != "success" or not text.text:
            logger.warning("Không đọc được nội dung CV %s: %s", resume_url, text.metadata.error_message)
            return await _upsert_cv(session, {
                **base, "status": FAILED, "model": None, "result": None, "provenance": None,
                "text_metadata": text_meta,
                "error_code": text.metadata.error_code or "TEXT_EXTRACTION_FAILED",
                "error_message": text.metadata.error_message or "Không đọc được nội dung file CV",
            })

        # Che PII trước khi gửi AI. Còn dấu hiệu PII thì chỉ ghi cảnh báo, không chặn (không có bước người duyệt).
        redacted = redact(text.text)
        leftover = remaining_contact_indicators(redacted)
        if leftover:
            logger.warning("CV %s: sau khi che vẫn còn dấu hiệu PII: %s", resume_url, ",".join(leftover))
            text_meta["pii_remaining"] = leftover

        manager = manager or _default_manager()
        # "nay"/"hiện tại" trong CV được AI quy đổi tới ngày này (prompt v2); lưu vào provenance.
        reference_date = datetime.now(ZoneInfo(get_settings().app_timezone)).strftime("%d/%m/%Y")
        try:
            facts, stats = await extract_cv_facts(redacted, manager, reference_date)
        except (LLMError, CitationError, InvalidOutputError) as exc:
            code, detail = _failure(exc)
            logger.error("Trích xuất CV %s thất bại (%s): %s", resume_url, code, detail)
            return await _upsert_cv(session, {
                **base, "status": FAILED, "model": None, "result": None, "provenance": None,
                "text_metadata": text_meta, "error_code": code, "error_message": detail,
            })

        return await _upsert_cv(session, {
            **base, "status": COMPLETED, "model": stats.model, "result": facts.model_dump(mode="json"),
            "provenance": {**_provenance(stats, EXTRACT_CV_VERSION, cv_extraction_prompt("")),
                           "reference_date": reference_date},
            "text_metadata": text_meta, "error_code": None, "error_message": None,
        })


# --------------------------------------------------------------------------------------------------------------
# JD
# --------------------------------------------------------------------------------------------------------------

async def _jd_by_hash(session: AsyncSession, content_hash: str) -> JDFactsRecord | None:
    stmt = select(JDFactsRecord).where(
        JDFactsRecord.content_hash == content_hash, JDFactsRecord.prompt_version == EXTRACT_JD_VERSION)
    return (await session.execute(stmt)).scalar_one_or_none()


async def _upsert_jd(session: AsyncSession, values: dict) -> JDFactsRecord:
    values = {**values, "prompt_version": EXTRACT_JD_VERSION, "updated_at": datetime.utcnow()}
    stmt = insert(JDFactsRecord).values(**values)
    set_ = {k: stmt.excluded[k] for k in values if k not in ("content_hash", "prompt_version", "job_posting_id")}
    set_["job_posting_id"] = func.coalesce(JDFactsRecord.job_posting_id, stmt.excluded.job_posting_id)
    stmt = stmt.on_conflict_do_update(constraint="uq_jd_facts_content_prompt", set_=set_).returning(JDFactsRecord.id)
    row_id = (await session.execute(stmt)).scalar_one()
    await session.commit()
    return await session.get(JDFactsRecord, row_id, populate_existing=True)


async def get_or_extract_jd(
    session_factory: async_sessionmaker[AsyncSession],
    job: JobInfo,
    job_posting_id: int | None,
    *,
    manager: LLMManager | None = None,
    force: bool = False,
) -> JDFactsRecord:
    """Trả yêu cầu JD COMPLETED có sẵn, hoặc trích xuất mới (lưu cả khi FAILED)."""
    content_hash = jd_content_hash(job)
    async with session_factory() as session:
        if not force:
            row = await _jd_by_hash(session, content_hash)
            if row is not None and row.status == COMPLETED:
                return row

        base = {"content_hash": content_hash, "job_posting_id": job_posting_id}
        manager = manager or _default_manager()
        # "nay"/"hiện tại" trong CV được AI quy đổi tới ngày này (prompt v2); lưu vào provenance.
        reference_date = datetime.now(ZoneInfo(get_settings().app_timezone)).strftime("%d/%m/%Y")
        try:
            facts, stats = await extract_jd_facts(job.as_text(), manager)
        except (LLMError, CitationError, InvalidOutputError) as exc:
            code, detail = _failure(exc)
            logger.error("Trích xuất JD (tin %s) thất bại (%s): %s", job_posting_id, code, detail)
            return await _upsert_jd(session, {
                **base, "status": FAILED, "model": None, "result": None, "provenance": None,
                "error_code": code, "error_message": detail,
            })
        return await _upsert_jd(session, {
            **base, "status": COMPLETED, "model": stats.model, "result": facts.model_dump(mode="json"),
            "provenance": _provenance(stats, EXTRACT_JD_VERSION, jd_extraction_prompt("")),
            "error_code": None, "error_message": None,
        })


def _default_manager() -> LLMManager:
    from app.core.llm_client import get_llm_manager
    return get_llm_manager()
