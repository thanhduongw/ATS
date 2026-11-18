"""Canh gác consumer của hàng đợi chấm điểm.

Kết nối RabbitMQ có thể rớt giữa chừng (mất heartbeat, RabbitMQ khởi động lại) mà aio-pika không đăng ký lại consumer:
hàng đợi còn tin nhưng 0 consumer, hồ sơ không được chấm (lỗi 1.5, gặp lại ngày 17/11). Cứ `interval` giây hỏi RabbitMQ
số consumer; bằng 0 hoặc hỏi lỗi thì dựng lại kết nối và worker.

Mọi thao tác RabbitMQ ở đây đều có giới hạn thời gian: khi kết nối vừa rớt, kênh "robust" của aio-pika chờ nối lại
vô thời hạn — lần đầu viết canh gác không có giới hạn nên chính vòng canh gác treo theo và không bao giờ nối lại.
"""
from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any, Protocol

logger = logging.getLogger(__name__)

CHECK_TIMEOUT = 10.0
RECONNECT_TIMEOUT = 30.0


class QueueManager(Protocol):
    @property
    def channel(self) -> Any: ...

    async def connect(self) -> None: ...

    async def disconnect(self) -> None: ...


async def bounded(aw: Awaitable[Any], seconds: float, what: str) -> Any:
    """Chờ `aw` tối đa `seconds` giây. Quá hạn → TimeoutError; thao tác bị thư viện huỷ ngang (kết nối đóng khi đang
    chờ) → ConnectionError, để vòng canh gác coi là lỗi kết nối thay vì chết theo CancelledError."""
    task = asyncio.ensure_future(aw)
    try:
        done, _ = await asyncio.wait({task}, timeout=seconds)
    except asyncio.CancelledError:  # chính vòng canh gác bị huỷ (service tắt)
        task.cancel()
        raise
    if not done:
        task.cancel()
        raise TimeoutError(f"{what}: RabbitMQ không phản hồi sau {seconds:g} giây")
    if task.cancelled():
        raise ConnectionError(f"{what}: thao tác bị huỷ giữa chừng")
    return task.result()


async def check_once(manager: QueueManager, start_worker: Callable[[], Awaitable[None]], queue_name: str) -> bool:
    """Một lượt kiểm tra. Trả True nếu đã phải dựng lại kết nối (thành công hay chưa)."""
    try:
        state = await bounded(manager.channel.declare_queue(queue_name, durable=True, passive=True),
                              CHECK_TIMEOUT, "kiểm tra hàng đợi")
        if state.declaration_result.consumer_count > 0:
            return False
        logger.warning("Hàng đợi chấm điểm không còn consumer — đăng ký lại")
    except Exception as e:  # noqa: BLE001
        logger.warning("Kết nối RabbitMQ có vấn đề (%s) — nối lại", e)
    try:
        try:
            await bounded(manager.disconnect(), CHECK_TIMEOUT, "đóng kết nối cũ")
        except Exception:  # noqa: BLE001 — kết nối cũ hỏng thì bỏ, tạo kết nối mới
            pass
        await bounded(manager.connect(), RECONNECT_TIMEOUT, "kết nối lại")
        await bounded(start_worker(), RECONNECT_TIMEOUT, "đăng ký worker")
        logger.info("Đã nối lại RabbitMQ và worker chấm điểm.")
    except Exception as e:  # noqa: BLE001
        logger.warning("Nối lại RabbitMQ thất bại (%s) — thử lại ở lượt sau", e)
    return True


async def watch(manager: QueueManager, start_worker: Callable[[], Awaitable[None]], queue_name: str,
                interval: float = 30.0) -> None:
    while True:
        await asyncio.sleep(interval)
        await check_once(manager, start_worker, queue_name)
