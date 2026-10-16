"""
Chấm điểm nền:
- Worker nghe `application.created` (application-service phát khi có hồ sơ mới) và chấm hồ sơ đó.
- Hàng đợi trong tiến trình cho "Chấm tất cả hồ sơ của tin" (HR).

Message luôn được ack: hệ thống không có dead-letter queue, requeue khi lỗi sẽ lặp vô hạn.
Lỗi đã được ghi vào ai_scores (FAILED + lý do) để HR chấm lại.
"""

from __future__ import annotations

import asyncio
import json
import logging

import aio_pika

from app.core.config import get_settings
from app.core.rabbitmq import ATS_EXCHANGE, rabbitmq_manager
from app.services.application_scoring import ScoringInProgressError, score_application

logger = logging.getLogger(__name__)

# [GIẢI THÍCH] Tên hàng đợi ai-service nghe, và "routing key" của sự kiện có hồ sơ mới.
# application-service phát sự kiện với key application.created; RabbitMQ chuyển vào hàng đợi này.
APPLICATION_CREATED_QUEUE = "ai.application-created.queue"
APPLICATION_CREATED_ROUTING_KEY = "application.created"

_semaphore: asyncio.Semaphore | None = None
_background: set[asyncio.Task] = set()


# [GIẢI THÍCH] Semaphore = "cái cổng" chỉ cho tối đa N hồ sơ được chấm cùng lúc (N = scoring_max_parallel, mặc định 2).
# Hồ sơ thứ N+1 phải đứng chờ, để không dồn quá nhiều lời gọi Gemini một lúc.
def _limiter() -> asyncio.Semaphore:
    """Giới hạn số hồ sơ chấm song song (tránh vượt hạn mức gọi LLM)."""
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(get_settings().scoring_max_parallel)
    return _semaphore


# [GIẢI THÍCH] Chấm MỘT hồ sơ: đi qua cổng giới hạn, gọi score_application, mọi lỗi chỉ ghi log.
# Không ném lỗi ra ngoài vì lỗi đã được lưu FAILED trong DB để HR chấm lại.
async def run_scoring(application_id: int, headers: dict[str, str] | None = None) -> None:
    """Chấm một hồ sơ trong giới hạn song song; không ném lỗi ra ngoài."""
    async with _limiter():
        try:
            score = await score_application(application_id, headers)
            logger.info("Đã chấm hồ sơ %s: %s %s", application_id, score.status, score.total_score)
        except ScoringInProgressError:
            logger.info("Hồ sơ %s đang được chấm ở nơi khác — bỏ qua", application_id)
        except Exception:  # noqa: BLE001
            logger.exception("Không chấm được hồ sơ %s", application_id)


# [GIẢI THÍCH] Dùng cho nút "AI chấm hồ sơ của tin": tạo task chạy nền cho từng hồ sơ rồi trả lời API ngay.
# Giữ task trong tập _background để Python không thu gom (xoá) task khi nó đang chạy dở.
def schedule_scoring(application_ids: list[int], headers: dict[str, str] | None = None) -> None:
    """Xếp hàng chấm nền (chấm bù). Giữ tham chiếu task để không bị thu gom giữa chừng."""
    for application_id in application_ids:
        task = asyncio.create_task(run_scoring(application_id, headers))
        _background.add(task)
        task.add_done_callback(_background.discard)


# [GIẢI THÍCH] Được gọi MỖI KHI hàng đợi có tin nhắn mới (ứng viên vừa nộp hồ sơ).
# message.process(...): chạy xong khối này thì báo RabbitMQ "đã nhận" (ack) -> tin nhắn bị xoá khỏi hàng đợi.
# Đọc applicationId trong JSON; JSON hỏng thì bỏ qua; đúng thì gọi run_scoring để chấm.
async def _handle(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process(ignore_processed=True):
        try:
            application_id = int(json.loads(message.body)["applicationId"])
        except (ValueError, KeyError, TypeError):
            logger.warning("Bỏ qua message application.created không hợp lệ: %r", message.body[:200])
            return
        await run_scoring(application_id)


# [GIẢI THÍCH] Chạy 1 lần lúc ai-service khởi động (gọi trong app/main.py):
# khai báo exchange ats.events, khai báo hàng đợi (durable = bền qua khởi động lại), gắn với key application.created,
# rồi đăng ký _handle làm hàm xử lý tin nhắn.
async def start_scoring_worker() -> None:
    channel = rabbitmq_manager.channel
    exchange = await channel.declare_exchange(ATS_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True)
    queue = await channel.declare_queue(APPLICATION_CREATED_QUEUE, durable=True)
    await queue.bind(exchange, routing_key=APPLICATION_CREATED_ROUTING_KEY)
    await queue.consume(_handle)
    logger.info("Scoring worker đang nghe %s", APPLICATION_CREATED_QUEUE)
