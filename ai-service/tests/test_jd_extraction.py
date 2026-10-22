"""Phần 2: trích xuất JD (Bước 1) — prompt, mã băm nội dung, engine với LLM giả, lưu DB và dùng lại.

Test DB dùng Postgres thật (DB riêng ats_ai_test) và tự bỏ qua nếu không kết nối được.
Đặt TEST_DATABASE_URL để dùng DB khác.
"""

from __future__ import annotations

import asyncio
import os

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.llm_client import BaseLLMClient, LLMError, LLMManager, LLMUsage
from app.models import JDExtraction
from app.schemas.jd_extraction import ExtractedJD, Importance, RequirementItem
from app.services import jd_extraction_store as store
from app.services.jd_extraction_engine import extract_jd, jd_content_hash
from app.services.prompts.jd_extraction import PROMPT_VERSION, build_jd_extraction_prompt
from app.services.scoring.prompt import JobInfo

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


JOB = JobInfo(
    title="Lập trình viên Backend Java",
    experience_required="3 năm",
    description="Xây dựng API, thiết kế cơ sở dữ liệu.",
    requirements="Bắt buộc: Java, Spring Boot, SQL.\nBiết Docker là lợi thế.",
)


class FakeLLM(BaseLLMClient):
    def __init__(self, fail: bool = False):
        super().__init__("fake-model")
        self.fail = fail
        self.calls = 0
        self.prompts: list[str] = []

    def provider_name(self):
        return "fake"

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        self.calls += 1
        self.prompts.append(user_prompt)
        await asyncio.sleep(0.05)
        if self.fail:
            raise LLMError("quota exceeded", provider="fake")
        assert system_prompt is None, "trích xuất JD phải dùng chế độ một tin nhắn"
        assert response_model is ExtractedJD
        jd = ExtractedJD(job_title="Lập trình viên Backend Java",
                         skills=[RequirementItem(name="Java", importance=Importance.REQUIRED)])
        return jd, LLMUsage(model=self.model, input_tokens=100, output_tokens=50)


def manager(llm: FakeLLM) -> LLMManager:
    m = LLMManager(primary=llm, use_fallback=False)
    m.BACKOFF_SECONDS = [0, 0]
    return m


# ============================================================
# Prompt và mã băm (không cần DB)
# ============================================================

def test_prompt_wraps_jd_and_has_version():
    prompt = build_jd_extraction_prompt(JOB.as_text())
    begin, end = prompt.index("### BEGIN JD ###"), prompt.index("### END JD ###")
    assert begin < prompt.index("Bắt buộc: Java, Spring Boot, SQL.") < end
    assert PROMPT_VERSION == "v1.0"
    assert "REQUIRED" in prompt and "PREFERRED" in prompt


def test_content_hash_ignores_whitespace_only_changes():
    spaced = JobInfo(title="  Lập trình viên   Backend Java ", experience_required="3  năm",
                     description="Xây dựng API,\n\n  thiết kế cơ sở dữ liệu.",
                     requirements="Bắt buộc:   Java, Spring Boot, SQL.\r\nBiết Docker là lợi thế.  ")
    assert jd_content_hash(spaced) == jd_content_hash(JOB)
    assert len(jd_content_hash(JOB)) == 64


def test_content_hash_changes_when_content_changes():
    changed = JobInfo(title=JOB.title, experience_required="5 năm",
                      description=JOB.description, requirements=JOB.requirements)
    assert jd_content_hash(changed) != jd_content_hash(JOB)


async def test_extract_jd_with_fake_llm():
    llm = FakeLLM()
    jd, usage = await extract_jd(JOB, manager(llm))
    assert isinstance(jd, ExtractedJD) and jd.skills[0].name == "Java"
    assert usage.model == "fake-model" and llm.calls == 1
    assert "### BEGIN JD ###" in llm.prompts[0]


# ============================================================
# Lưu trữ trích xuất JD (Postgres thật)
# ============================================================

TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai_test")


@pytest.fixture
async def session_factory():
    engine = create_async_engine(TEST_DB)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: JDExtraction.__table__.create(c, checkfirst=True))
            await conn.execute(delete(JDExtraction))
    except Exception as exc:  # noqa: BLE001
        await engine.dispose()
        pytest.skip(f"Không kết nối được Postgres test: {exc}")
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


async def test_extracts_once_then_reuses(session_factory):
    llm = FakeLLM()
    row = await store.get_or_extract_jd(session_factory, JOB, 5, manager=manager(llm))
    assert row.status == store.COMPLETED and llm.calls == 1
    assert row.result["skills"][0]["name"] == "Java"
    assert row.provenance["prompt_version"] == PROMPT_VERSION and row.provenance["input_tokens"] == 100
    assert row.job_posting_id == 5

    # Tin khác nhưng cùng nội dung JD: dùng lại, không gọi LLM
    again = await store.get_or_extract_jd(session_factory, JOB, 6, manager=manager(llm))
    assert again.id == row.id and llm.calls == 1


async def test_changed_jd_extracts_again(session_factory):
    llm = FakeLLM()
    first = await store.get_or_extract_jd(session_factory, JOB, 5, manager=manager(llm))
    edited = JobInfo(title=JOB.title, experience_required="5 năm",
                     description=JOB.description, requirements=JOB.requirements)
    second = await store.get_or_extract_jd(session_factory, edited, 5, manager=manager(llm))
    assert second.id != first.id and llm.calls == 2


async def test_force_re_extracts(session_factory):
    llm = FakeLLM()
    first = await store.get_or_extract_jd(session_factory, JOB, 5, manager=manager(llm))
    again = await store.get_or_extract_jd(session_factory, JOB, 5, manager=manager(llm), force=True)
    assert again.id == first.id and llm.calls == 2


async def test_llm_failure_saved_then_retried(session_factory):
    failed = await store.get_or_extract_jd(session_factory, JOB, 5, manager=manager(FakeLLM(fail=True)))
    assert failed.status == store.FAILED and failed.result is None and "quota" in failed.error_message

    good = FakeLLM()
    ok = await store.get_or_extract_jd(session_factory, JOB, 5, manager=manager(good))
    assert ok.id == failed.id and ok.status == store.COMPLETED and good.calls == 1
    assert ok.error_message is None


async def test_concurrent_requests_one_row(session_factory):
    llm = FakeLLM()
    rows = await asyncio.gather(*[
        store.get_or_extract_jd(session_factory, JOB, 5, manager=manager(llm)) for _ in range(4)])
    assert len({r.id for r in rows}) == 1
    async with session_factory() as s:
        assert (await s.execute(select(func.count()).select_from(JDExtraction))).scalar_one() == 1
