"""
Worker nghe sự kiện của ứng viên (do candidate-service phát):

- `cv.uploaded`       {candidateId, resumeUrl} → trích xuất CV (dùng lại nếu đã có) rồi lập chỉ mục vector,
                      để ứng viên chưa nộp hồ sơ nào (HR thêm tay, tải CV ở trang cá nhân) vẫn tìm được.
- `candidate.deleted` {candidateId}            → xoá embedding, hồ sơ tìm kiếm và kết quả trích xuất của ứng viên (GDPR).

Message luôn được ack: hệ thống không có dead-letter queue, requeue khi lỗi sẽ lặp vô hạn.
Lỗi chỉ ghi log; backfill (`POST /embeddings/backfill`) chạy lại được cho phần bị lỡ.
"""

from __future__ import annotations

import asyncio
import json
import logging

import aio_pika

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.core.rabbitmq import ATS_EXCHANGE, CV_UPLOADED_QUEUE, CV_UPLOADED_ROUTING_KEY, rabbitmq_manager
from app.core.vector_schema import vector_enabled
from app.services.facts_store import COMPLETED, get_or_extract_cv
from app.services.cv_indexing import delete_candidate_data, index_candidate_cv

logger = logging.getLogger(__name__)

CANDIDATE_DELETED_QUEUE = "ai.candidate-deleted.queue"
CANDIDATE_DELETED_ROUTING_KEY = "candidate.deleted"

_semaphore: asyncio.Semaphore | None = None


def _limiter() -> asyncio.Semaphore:
    """Dùng chung hạn mức song song với chấm điểm để không dồn quá nhiều lời gọi Gemini."""
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(get_settings().scoring_max_parallel)
    return _semaphore


def _parse(message: aio_pika.abc.AbstractIncomingMessage, *keys: str) -> dict | None:
    try:
        data = json.loads(message.body)
        return {k: data[k] for k in keys}
    except (ValueError, KeyError, TypeError):
        logger.warning("Bỏ qua message không hợp lệ: %r", message.body[:200])
        return None


async def handle_cv_uploaded(candidate_id: int, resume_url: str) -> None:
    if not vector_enabled():
        return  # pgvector tắt: bỏ qua (vẫn ack để queue không đầy), khỏi tốn lời gọi Gemini
    async with _limiter():
        extraction = await get_or_extract_cv(async_session_factory, resume_url, candidate_id)
        if extraction.status != COMPLETED or not extraction.result:
            logger.info("CV của ứng viên %s chưa trích xuất được (%s) — không lập chỉ mục",
                        candidate_id, extraction.error_message)
            return
        indexed = await index_candidate_cv(async_session_factory, candidate_id, extraction.file_hash, extraction.result,
                                           identity=(extraction.text_metadata or {}).get("identity"))
        logger.info("Ứng viên %s: lập chỉ mục CV %s", candidate_id, "xong" if indexed else "bỏ qua (đã có)")


async def _on_cv_uploaded(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process(ignore_processed=True):
        data = _parse(message, "candidateId", "resumeUrl")
        if data is None or not data["resumeUrl"]:
            return
        try:
            await handle_cv_uploaded(int(data["candidateId"]), str(data["resumeUrl"]))
        except Exception:  # noqa: BLE001
            logger.exception("Không xử lý được cv.uploaded: %r", data)


async def _on_candidate_deleted(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process(ignore_processed=True):
        data = _parse(message, "candidateId")
        if data is None:
            return
        try:
            counts = await delete_candidate_data(async_session_factory, int(data["candidateId"]))
            logger.info("Đã xoá dữ liệu AI của ứng viên %s: %s", data["candidateId"], counts)
        except Exception:  # noqa: BLE001
            logger.exception("Không xoá được dữ liệu AI của ứng viên %s", data)


async def start_candidate_event_workers() -> None:
    channel = rabbitmq_manager.channel
    exchange = await channel.declare_exchange(ATS_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True)

    # Xoá dữ liệu: vẫn phải xoá cv_extractions kể cả khi tắt vector.
    deleted_q = await channel.declare_queue(CANDIDATE_DELETED_QUEUE, durable=True)
    await deleted_q.bind(exchange, routing_key=CANDIDATE_DELETED_ROUTING_KEY)
    await deleted_q.consume(_on_candidate_deleted)

    # Luôn nghe cv.uploaded (queue đã được rabbitmq_manager khai báo) để không dồn tin; handler tự bỏ qua khi pgvector tắt.
    cv_q = await channel.declare_queue(CV_UPLOADED_QUEUE, durable=True)
    await cv_q.bind(exchange, routing_key=CV_UPLOADED_ROUTING_KEY)
    await cv_q.consume(_on_cv_uploaded)
    logger.info("Đang nghe %s và %s (vector %s)", CV_UPLOADED_QUEUE, CANDIDATE_DELETED_QUEUE,
                "bật" if vector_enabled() else "tắt")
