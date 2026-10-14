"""Giai đoạn 0: S3 URL, LLM client (một tin nhắn, không dự phòng, provider kbench), auth."""

from __future__ import annotations

import contextlib
import sys
import types

import pytest
from fastapi import HTTPException
from pydantic import BaseModel

from app.core.auth import CurrentUser, current_user, require_hr, require_internal
from app.core.llm_client import (
    KbenchClient,
    LLMError,
    LLMManager,
    LLMUsage,
    BaseLLMClient,
    _calculate_cost,
    make_client,
)
from app.core.s3_client import parse_s3_url

# Test async chạy qua plugin pytest của anyio (đã có sẵn cùng httpx).
pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ============================================================
# S3 URL
# ============================================================

class TestParseS3Url:
    def test_virtual_hosted_with_region(self):
        url = "https://ats-system-cv-storage.s3.ap-southeast-1.amazonaws.com/candidates/7/abc-cv.pdf"
        assert parse_s3_url(url) == ("ats-system-cv-storage", "candidates/7/abc-cv.pdf")

    def test_virtual_hosted_legacy(self):
        assert parse_s3_url("https://b.s3.amazonaws.com/k/x.pdf") == ("b", "k/x.pdf")

    def test_path_style(self):
        assert parse_s3_url("https://s3.ap-southeast-1.amazonaws.com/b/k/x.pdf") == ("b", "k/x.pdf")

    def test_s3_scheme(self):
        assert parse_s3_url("s3://b/k/x.pdf") == ("b", "k/x.pdf")

    def test_url_encoded_key(self):
        assert parse_s3_url("https://b.s3.amazonaws.com/k/Nguyen%20CV.pdf") == ("b", "k/Nguyen CV.pdf")

    def test_custom_endpoint(self):
        assert parse_s3_url("http://localhost:9000/b/k.pdf", "http://localhost:9000") == ("b", "k.pdf")

    @pytest.mark.parametrize("url", [
        "http://169.254.169.254/latest/meta-data",
        "https://evil.example.com/b/k.pdf",
        "http://localhost:8080/api/candidate/candidates/cv-file/x.pdf",
        "https://b.s3.amazonaws.com/",
        "",
    ])
    def test_rejects_non_s3(self, url):
        with pytest.raises(ValueError):
            parse_s3_url(url)


def test_key_from_url_rejects_other_bucket(monkeypatch):
    from app.core import s3_client

    client = s3_client.S3Client.__new__(s3_client.S3Client)
    client._bucket, client._endpoint = "mine", ""
    assert client.key_from_url("https://mine.s3.amazonaws.com/a/b.pdf") == "a/b.pdf"
    with pytest.raises(ValueError):
        client.key_from_url("https://other.s3.amazonaws.com/a/b.pdf")


# ============================================================
# LLM client
# ============================================================

class Out(BaseModel):
    value: int


class FakeClient(BaseLLMClient):
    def __init__(self, model: str, fail_times: int = 0):
        super().__init__(model)
        self.fail_times = fail_times
        self.calls: list[tuple[str, str | None]] = []

    def provider_name(self) -> str:
        return "fake"

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        self.calls.append((user_prompt, system_prompt))
        if len(self.calls) <= self.fail_times:
            raise LLMError("boom", provider="fake")
        return response_model(value=1), LLMUsage(model=self.model)


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    async def _sleep(_):
        return None
    monkeypatch.setattr("app.core.llm_client.asyncio.sleep", _sleep)


async def test_single_message_mode_passes_no_system_prompt():
    primary = FakeClient("p")
    out, _ = await LLMManager(primary=primary, use_fallback=False).generate_structured("PROMPT", Out)
    assert out.value == 1
    assert primary.calls == [("PROMPT", None)]


async def test_no_fallback_raises_after_retries():
    primary = FakeClient("p", fail_times=99)
    with pytest.raises(LLMError):
        await LLMManager(primary=primary, use_fallback=False).generate_structured("x", Out)
    assert len(primary.calls) == LLMManager.MAX_RETRIES + 1


async def test_empty_fallback_setting_means_no_fallback(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "fallback_llm_model", "")
    manager = LLMManager(primary=FakeClient("p", fail_times=99))
    assert manager._fallback is None


async def test_fallback_used_when_configured():
    manager = LLMManager(primary=FakeClient("p", fail_times=99), fallback=FakeClient("f"))
    _, usage = await manager.generate_structured("x", Out)
    assert usage.fallback_used and usage.model == "f"


async def test_retry_count_recorded():
    _, usage = await LLMManager(primary=FakeClient("p", fail_times=1), use_fallback=False).generate_structured("x", Out)
    assert usage.retries == 1


def test_make_client_routing():
    assert make_client("kbench:google/gemini-3.5-flash-lite").provider_name() == "kbench"
    assert make_client("kbench:google/gemini-3.5-flash-lite").model == "google/gemini-3.5-flash-lite"
    assert make_client("gemini-3.5-flash-lite").provider_name() == "gemini"
    assert make_client("gpt-4o-mini").provider_name() == "openai"


def test_unknown_model_cost_is_zero_not_guessed():
    assert _calculate_cost("model-not-in-table", 1_000_000, 1_000_000) == 0.0
    assert _calculate_cost("gemini-3.5-flash-lite", 1_000_000, 0) > 0


@pytest.fixture
def fake_kbench(monkeypatch):
    """Giả lập SDK kaggle_benchmarks: ghi lại tin nhắn, kiểm tra mỗi lời gọi có chat riêng."""
    state = {"messages": [], "chats_open": 0, "max_open": 0}

    class FakeLLM:
        def prompt(self, message, schema=str, seed=0, temperature=0):
            assert state["chats_open"] == 1, "phải gọi trong kbench.chats.new()"
            state["messages"].append((message, seed, temperature))
            return schema(value=7)

    class Chats:
        @staticmethod
        @contextlib.contextmanager
        def new(name):
            state["chats_open"] += 1
            yield
            state["chats_open"] -= 1

    module = types.SimpleNamespace(llms={"google/gemini-3.5-flash-lite": FakeLLM()}, chats=Chats)
    monkeypatch.setitem(sys.modules, "kaggle_benchmarks", module)
    return state


async def test_kbench_client_isolated_chat_and_merges_system(fake_kbench):
    client = KbenchClient("google/gemini-3.5-flash-lite")
    out, usage = await client.generate_structured("DATA", Out, system_prompt="RULES")
    assert out.value == 7
    assert fake_kbench["messages"][0][0] == "RULES\n\nDATA"
    assert usage.model == "kbench:google/gemini-3.5-flash-lite"
    await client.generate_structured("DATA2", Out)
    assert fake_kbench["messages"][1][0] == "DATA2"


async def test_kbench_client_wraps_errors(fake_kbench):
    with pytest.raises(LLMError):
        await KbenchClient("unknown/model").generate_structured("x", Out)


# ============================================================
# Auth
# ============================================================

def test_current_user_requires_headers():
    with pytest.raises(HTTPException) as exc:
        current_user(None, None, None, None)
    assert exc.value.status_code == 401


def test_roles():
    hm = current_user("5", "hm@x", "hiring_manager", "3")
    assert hm == CurrentUser(5, "hm@x", "HIRING_MANAGER", 3)
    require_internal(hm)
    with pytest.raises(HTTPException):
        require_hr(hm)
    with pytest.raises(HTTPException):
        require_internal(current_user("9", "c@x", "CANDIDATE", None))
    assert hm.headers()["X-Department-Id"] == "3"
