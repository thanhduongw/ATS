"""Canh gác consumer hàng đợi chấm điểm: không được treo khi kênh RabbitMQ treo hoặc bị huỷ ngang."""
import asyncio
from types import SimpleNamespace

import pytest

from app.workers import scoring_watchdog
from app.workers.scoring_watchdog import bounded, check_once


class FakeChannel:
    def __init__(self, mode: str, consumers: int = 1):
        self.mode = mode
        self.consumers = consumers

    async def declare_queue(self, name, durable=True, passive=False):
        if self.mode == "hang":
            await asyncio.Event().wait()  # kênh robust chờ nối lại vô thời hạn
        if self.mode == "cancelled":
            raise asyncio.CancelledError()  # thư viện huỷ thao tác đang chờ khi kết nối đóng
        return SimpleNamespace(declaration_result=SimpleNamespace(consumer_count=self.consumers))


class FakeManager:
    def __init__(self, channel: FakeChannel, connect_fails: bool = False):
        self.channel = channel
        self.connect_fails = connect_fails
        self.calls: list[str] = []

    async def connect(self):
        self.calls.append("connect")
        if self.connect_fails:
            raise ConnectionError("broker chưa lên")
        self.channel = FakeChannel("ok")

    async def disconnect(self):
        self.calls.append("disconnect")
        await asyncio.Event().wait()  # đóng kết nối hỏng cũng có thể treo


@pytest.fixture(autouse=True)
def short_timeouts(monkeypatch):
    monkeypatch.setattr(scoring_watchdog, "CHECK_TIMEOUT", 0.05)
    monkeypatch.setattr(scoring_watchdog, "RECONNECT_TIMEOUT", 0.05)


def run(manager):
    started: list[bool] = []

    async def start_worker():
        started.append(True)

    reconnected = asyncio.run(asyncio.wait_for(check_once(manager, start_worker, "q"), timeout=2))
    return reconnected, started


def test_healthy_queue_is_left_alone():
    manager = FakeManager(FakeChannel("ok", consumers=1))
    assert run(manager) == (False, [])
    assert manager.calls == []


def test_zero_consumers_reconnects_and_restarts_worker():
    manager = FakeManager(FakeChannel("ok", consumers=0))
    assert run(manager) == (True, [True])
    assert manager.calls == ["disconnect", "connect"]


def test_hanging_channel_times_out_instead_of_blocking_forever():
    manager = FakeManager(FakeChannel("hang"))
    assert run(manager) == (True, [True])
    assert manager.calls == ["disconnect", "connect"]


def test_cancelled_operation_is_treated_as_connection_error():
    manager = FakeManager(FakeChannel("cancelled"))
    assert run(manager) == (True, [True])


def test_failed_reconnect_is_logged_and_retried_next_round():
    manager = FakeManager(FakeChannel("hang"), connect_fails=True)
    assert run(manager) == (True, [])


def test_bounded_propagates_cancellation_of_the_watchdog_itself():
    async def scenario():
        inner = asyncio.Event()
        task = asyncio.create_task(bounded(inner.wait(), 10, "x"))
        await asyncio.sleep(0.01)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(scenario())
