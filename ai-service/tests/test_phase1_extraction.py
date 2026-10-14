"""Giai đoạn 1: số năm kinh nghiệm, trích xuất CV lưu DB (Postgres thật — DB riêng ats_ai_test), API.

Test DB tự bỏ qua nếu không kết nối được Postgres. Đặt TEST_DATABASE_URL để dùng DB khác.
"""

from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager
from datetime import date

import fitz
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.llm_client import BaseLLMClient, LLMError, LLMManager, LLMUsage
from app.models import CVExtraction
from app.schemas.cv_extraction import CandidateInfo, ExtractedCV, WorkExperience
from app.services import cv_extraction_store as store
from app.services.experience import calculate_years_of_experience, parse_date

pytestmark = pytest.mark.anyio

TODAY = date(2026, 10, 15)


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ============================================================
# Số năm kinh nghiệm
# ============================================================

class TestParseDate:
    @pytest.mark.parametrize("text, expected", [
        ("2020", date(2020, 1, 1)),
        ("2020-01", date(2020, 1, 1)),
        ("2020.12", date(2020, 12, 1)),
        ("2020/03/15", date(2020, 3, 1)),
        ("01/2020", date(2020, 1, 1)),
        ("12.2020", date(2020, 12, 1)),
        ("6-2023", date(2023, 6, 1)),
        ("15/01/2020", date(2020, 1, 1)),
        ("Jan 2020", date(2020, 1, 1)),
        ("Dec. 2020", date(2020, 12, 1)),
        ("March, 2021", date(2021, 3, 1)),
        ("Sept 2019", date(2019, 9, 1)),
        ("Tháng 1/2020", date(2020, 1, 1)),
        ("tháng 12 năm 2023", date(2023, 12, 1)),
        ("Thg 5, 2022", date(2022, 5, 1)),
        ("T12/2020", date(2020, 12, 1)),
    ])
    def test_formats(self, text, expected):
        assert parse_date(text, TODAY) == expected

    @pytest.mark.parametrize("text", ["Present", "Hiện tại", "Hiện nay", "Đến nay", "nay", "Now", "to present"])
    def test_present(self, text):
        assert parse_date(text, TODAY) == TODAY

    @pytest.mark.parametrize("text", [None, "", "   ", "13/2020", "abc", "2020-13"])
    def test_invalid(self, text):
        assert parse_date(text, TODAY) is None


def job(start, end=None, current=False):
    return WorkExperience(company="X", title="Dev", start_date=start, end_date=end, is_current=current)


class TestYears:
    def test_present_counts_to_today(self):
        # Ví dụ LLM tính sai khi thăm dò Kaggle: 2019–2023 + 2023–nay ≈ 7,8 năm (không phải "hơn 4 năm")
        years = calculate_years_of_experience([job("2019", "2023"), job("2023", "nay")], TODAY)
        assert years == pytest.approx(7.8, abs=0.1)

    def test_is_current_without_end(self):
        assert calculate_years_of_experience([job("10/2024", current=True)], TODAY) == pytest.approx(2.0, abs=0.1)

    def test_overlap_merged(self):
        assert calculate_years_of_experience([job("2020", "2023"), job("2021", "2022")], TODAY) == pytest.approx(3.0, abs=0.1)

    def test_future_end_clamped(self):
        assert calculate_years_of_experience([job("2025-10", "2030-01")], TODAY) == pytest.approx(1.0, abs=0.1)

    def test_unknown_is_none_not_zero(self):
        assert calculate_years_of_experience([job(None, "2020"), job("2020")], TODAY) is None


# ============================================================
# Lưu trữ trích xuất (Postgres thật)
# ============================================================

TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai_test")


@pytest.fixture
async def session_factory():
    engine = create_async_engine(TEST_DB)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: CVExtraction.__table__.create(c, checkfirst=True))
            await conn.execute(delete(CVExtraction))
    except Exception as exc:  # noqa: BLE001
        await engine.dispose()
        pytest.skip(f"Không kết nối được Postgres test: {exc}")
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


class FakeLLM(BaseLLMClient):
    def __init__(self, fail: bool = False):
        super().__init__("fake-model")
        self.fail = fail
        self.calls = 0

    def provider_name(self):
        return "fake"

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        self.calls += 1
        await asyncio.sleep(0.05)
        if self.fail:
            raise LLMError("quota exceeded", provider="fake")
        assert system_prompt is None, "trích xuất CV phải dùng chế độ một tin nhắn"
        cv = ExtractedCV(candidate=CandidateInfo(name="Nguyễn Văn A"), skills=["Java"],
                         work_experience=[job("2019", "nay")])
        return cv, LLMUsage(model=self.model, input_tokens=100, output_tokens=50)


def manager(llm: FakeLLM) -> LLMManager:
    m = LLMManager(primary=llm, use_fallback=False)
    m.BACKOFF_SECONDS = [0, 0]
    return m


def pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text * 5, fontsize=11)
    return doc.tobytes()


CV = pdf_bytes("Backend Developer Java Spring Boot PostgreSQL Docker 2019 - nay. ")
URL = "https://bucket.s3.ap-southeast-1.amazonaws.com/candidates/1/a.pdf"


async def test_extracts_once_then_reuses_by_url(session_factory, monkeypatch):
    llm = FakeLLM()
    row = await store.get_or_extract(session_factory, URL, 1, manager=manager(llm), cv_bytes=CV)
    assert row.status == store.COMPLETED and llm.calls == 1
    assert row.result["extracted_cv"]["candidate"]["name"] == "Nguyễn Văn A"
    assert row.result["years_of_experience_calculated"] > 0
    assert row.text_metadata["extraction_method"] == "pymupdf"

    # Lần sau tra theo URL: không tải file, không gọi LLM
    async def no_download(_):
        raise AssertionError("không được tải lại file")
    monkeypatch.setattr(store, "_download", no_download)
    again = await store.get_or_extract(session_factory, URL, 1, manager=manager(llm))
    assert again.id == row.id and llm.calls == 1


async def test_same_file_other_url_reuses_by_hash(session_factory):
    llm = FakeLLM()
    first = await store.get_or_extract(session_factory, URL, 1, manager=manager(llm), cv_bytes=CV)
    other = await store.get_or_extract(session_factory, URL.replace("a.pdf", "b.pdf"), 1,
                                       manager=manager(llm), cv_bytes=CV)
    assert other.id == first.id and llm.calls == 1


async def test_force_re_extracts(session_factory):
    llm = FakeLLM()
    first = await store.get_or_extract(session_factory, URL, 1, manager=manager(llm), cv_bytes=CV)
    again = await store.get_or_extract(session_factory, URL, 1, force=True, manager=manager(llm), cv_bytes=CV)
    assert again.id == first.id and llm.calls == 2


async def test_llm_failure_saved_then_retried(session_factory):
    bad = FakeLLM(fail=True)
    failed = await store.get_or_extract(session_factory, URL, 1, manager=manager(bad), cv_bytes=CV)
    assert failed.status == store.FAILED and failed.error_code == "FAILED_EXTRACTION"
    assert "quota" in failed.error_message

    good = FakeLLM()
    ok = await store.get_or_extract(session_factory, URL, 1, manager=manager(good), cv_bytes=CV)
    assert ok.id == failed.id and ok.status == store.COMPLETED and good.calls == 1
    assert ok.error_message is None


async def test_unreadable_file_saved_as_failed(session_factory):
    llm = FakeLLM()
    row = await store.get_or_extract(session_factory, URL, 1, manager=manager(llm), cv_bytes=b"not a cv")
    assert row.status == store.FAILED and row.error_code == "INVALID_FILE_TYPE" and llm.calls == 0


async def test_concurrent_requests_one_row(session_factory):
    llm = FakeLLM()
    rows = await asyncio.gather(*[
        store.get_or_extract(session_factory, URL, 1, manager=manager(llm), cv_bytes=CV) for _ in range(4)])
    assert len({r.id for r in rows}) == 1
    async with session_factory() as s:
        assert (await s.execute(select(func.count()).select_from(CVExtraction))).scalar_one() == 1


async def test_download_errors_become_cv_unavailable(monkeypatch):
    class BadS3:
        def key_from_url(self, url):
            raise ValueError("CV không nằm trong bucket được phép")
    monkeypatch.setattr(store, "get_s3_client", lambda: BadS3())
    with pytest.raises(store.CVUnavailableError):
        await store._download("https://other.s3.amazonaws.com/x.pdf")


def test_to_response_shapes():
    ok = CVExtraction(id=5, status=store.COMPLETED, prompt_version="v1.1",
                      result={"extracted_cv": {"candidate": {"name": "A"}}, "overall_confidence": "HIGH",
                              "completeness": "PARTIAL"},
                      provenance={"model_used": "m", "prompt_version": "v1.1"})
    body = store.to_response(ok)
    assert body["status"] == "success" and body["extraction_id"] == 5
    failed = CVExtraction(id=6, status=store.FAILED, prompt_version="v1.1", error_code="X", error_message="lỗi")
    body = store.to_response(failed)
    assert body["status"] == "error" and body["error_message"] == "lỗi" and body["result"] is None


# ============================================================
# API
# ============================================================

HR = {"X-User-Id": "2", "X-User-Email": "hr@x", "X-User-Role": "RECRUITER"}
HM = {"X-User-Id": "3", "X-User-Email": "hm@x", "X-User-Role": "HIRING_MANAGER", "X-Department-Id": "1"}
CANDIDATE = {"X-User-Id": "4", "X-User-Email": "c@x", "X-User-Role": "CANDIDATE"}


@pytest.fixture
def api(monkeypatch):
    from app.api import access, cv_extraction
    from app.core.java_services import JavaServiceError
    from app.main import create_app

    calls = {"force": []}

    async def summary(application_id, headers=None):
        if application_id == 404:
            raise JavaServiceError("not found", 400)
        if application_id == 403:
            raise JavaServiceError("denied", 403)
        resume = {1: None, 422: "boom"}.get(application_id, URL)
        return {"id": application_id, "candidateId": 9, "resumeUrl": resume}

    async def fake_get_or_extract(factory, resume_url, candidate_id, *, force=False, **_):
        calls["force"].append(force)
        if resume_url == "boom":
            raise store.CVUnavailableError("x")
        return CVExtraction(id=1, status=store.FAILED, prompt_version="v1.1", error_code="E", error_message="m")

    monkeypatch.setattr(access, "get_application_summary", summary)
    monkeypatch.setattr(cv_extraction, "get_or_extract", fake_get_or_extract)
    app = create_app()
    app.router.lifespan_context = _no_lifespan  # không kết nối RabbitMQ / DB khi test API
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t"), calls


@asynccontextmanager
async def _no_lifespan(_app):
    yield


async def test_api_get_for_internal_user(api):
    client, calls = api
    r = await client.get("/api/v1/ai/cv-extractions", params={"applicationId": 7}, headers=HM)
    assert r.status_code == 200 and r.json()["extraction_id"] == 1 and calls["force"] == [False]


async def test_api_candidate_forbidden(api):
    client, _ = api
    r = await client.get("/api/v1/ai/cv-extractions", params={"applicationId": 7}, headers=CANDIDATE)
    assert r.status_code == 403


async def test_api_re_extract_hr_only(api):
    client, calls = api
    r = await client.post("/api/v1/ai/cv-extractions/re-extract", params={"applicationId": 7}, headers=HM)
    assert r.status_code == 403
    r = await client.post("/api/v1/ai/cv-extractions/re-extract", params={"applicationId": 7}, headers=HR)
    assert r.status_code == 200 and calls["force"] == [True]


@pytest.mark.parametrize("app_id, status", [(404, 404), (403, 403), (1, 404), (422, 422)])
async def test_api_access_and_missing_cv(api, app_id, status):
    client, _ = api
    r = await client.get("/api/v1/ai/cv-extractions", params={"applicationId": app_id}, headers=HR)
    assert r.status_code == status
