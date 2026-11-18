"""API điểm AI và dữ kiện CV: phân quyền, chấm bù theo tin, chấm lại toàn bộ (Postgres test thật, service giả)."""
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.java_services import JavaServiceError
from app.core.schema_migrate import migrate
from app.models import AIScore, CVFactsRecord
from app.services import application_scoring as svc

pytestmark = pytest.mark.anyio
TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai_test")


def headers(role):
    return {"X-User-Id": "7", "X-User-Email": "u@test.net", "X-User-Role": role}


ADMIN, HR, HM, CANDIDATE = headers("COMPANY_ADMIN"), headers("RECRUITER"), headers("HIRING_MANAGER"), headers("CANDIDATE")


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def factory():
    engine = create_async_engine(TEST_DB)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("DROP TABLE IF EXISTS ai_scores, ai_jobs, cv_facts, jd_facts CASCADE"))
        await migrate(engine)
    except Exception as exc:  # noqa: BLE001
        await engine.dispose()
        pytest.skip(f"Không kết nối được Postgres test: {exc}")
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


@asynccontextmanager
async def _no_lifespan(_app):
    yield


@pytest.fixture
async def api(factory, monkeypatch):
    from app.api import access, application_scores as routes, cv_extraction as cv_routes
    from app.core.database import get_db
    from app.main import create_app

    state = {"scheduled": [], "applications": [], "list_args": []}

    async def summary(application_id, headers=None):
        if application_id == 403:
            raise JavaServiceError("denied", 403)
        return {"id": application_id, "candidateId": 9, "resumeUrl": "https://b/candidates/9/cv.pdf"}

    async def fake_score(application_id, headers=None):
        if application_id == 409:
            raise svc.ScoringInProgressError("busy")
        return AIScore(application_id=application_id, job_posting_id=5, status="COMPLETED", total_score=80, tier="FIT")

    async def apps(job_posting_id, headers):
        state["list_args"].append(job_posting_id)
        return state["applications"]

    async def db():
        async with factory() as s:
            yield s
            await s.commit()

    monkeypatch.setattr(access, "get_application_summary", summary)
    monkeypatch.setattr(routes, "score_application", fake_score)
    monkeypatch.setattr(routes, "list_applications", apps)
    monkeypatch.setattr(routes, "async_session_factory", factory)
    monkeypatch.setattr(routes, "schedule_scoring", lambda ids, headers=None: state["scheduled"].extend(ids))
    monkeypatch.setattr(svc, "_publish_status", lambda score: _noop())
    monkeypatch.setattr(cv_routes, "async_session_factory", factory)
    app = create_app()
    app.router.lifespan_context = _no_lifespan
    app.dependency_overrides[get_db] = db
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t"), state


async def _noop():
    return None


async def test_get_score_returns_new_result_shape(api, factory):
    client, _ = api
    assert (await client.get("/api/v1/ai/scores/7", headers=HM)).status_code == 404
    async with factory() as s:
        s.add(AIScore(application_id=7, job_posting_id=5, candidate_id=9, status="COMPLETED", total_score=66.7,
                      tier="UNCLASSIFIED", result={"criteria": [], "tier_label": "Chưa phân loại"}))
        await s.commit()
    r = await client.get("/api/v1/ai/scores/7", headers=HM)
    assert r.status_code == 200 and r.json()["totalScore"] == 66.7 and r.json()["tier"] == "UNCLASSIFIED"
    assert r.json()["result"]["tier_label"] == "Chưa phân loại"
    assert (await client.get("/api/v1/ai/scores/403", headers=HM)).status_code == 403
    assert (await client.get("/api/v1/ai/scores/7", headers=CANDIDATE)).status_code == 403


async def test_rescore_hr_only(api):
    client, _ = api
    assert (await client.post("/api/v1/ai/scores/7/rescore", headers=HM)).status_code == 403
    r = await client.post("/api/v1/ai/scores/7/rescore", headers=HR)
    assert r.status_code == 200 and r.json()["totalScore"] == 80.0
    assert (await client.post("/api/v1/ai/scores/409/rescore", headers=HR)).status_code == 409


async def test_rescore_posting_queues_missing_failed_and_stale(api, factory):
    client, state = api
    state["applications"] = [{"id": i, "jobPostingId": 5, "candidateId": 100 + i} for i in range(1, 6)]
    old = datetime.utcnow() - timedelta(hours=1)
    async with factory() as s:
        s.add_all([
            AIScore(application_id=1, job_posting_id=5, candidate_id=101, status="COMPLETED"),
            AIScore(application_id=2, job_posting_id=5, candidate_id=102, status="FAILED"),
            AIScore(application_id=3, job_posting_id=5, candidate_id=103, status="PROCESSING"),
            AIScore(application_id=4, job_posting_id=5, candidate_id=104, status="PENDING", updated_at=old),
        ])
        await s.commit()
    assert (await client.post("/api/v1/ai/scores/rescore-posting", params={"jobPostingId": 5},
                              headers=HM)).status_code == 403
    r = await client.post("/api/v1/ai/scores/rescore-posting", params={"jobPostingId": 5}, headers=HR)
    assert r.json() == {"jobPostingId": 5, "total": 5, "queued": 3, "skipped": 2,
                       "skippedLowSimilarity": 0, "prefilterApplied": False}
    assert sorted(state["scheduled"]) == [2, 4, 5]


async def test_rescore_all_is_admin_only_and_requeues_completed(api, factory):
    client, state = api
    state["applications"] = [
        {"id": 1, "jobPostingId": 5, "candidateId": 101, "resumeUrl": "u1"},
        {"id": 2, "jobPostingId": 6, "candidateId": 102, "resumeUrl": "u2"},
        {"id": 3, "jobPostingId": 6, "candidateId": 103, "resumeUrl": "u3"},
        {"id": 4, "jobPostingId": 6, "candidateId": 104, "resumeUrl": None},   # không có CV
    ]
    async with factory() as s:
        s.add_all([
            AIScore(application_id=1, job_posting_id=5, candidate_id=101, status="COMPLETED", total_score=70, tier="FIT"),
            AIScore(application_id=2, job_posting_id=6, candidate_id=102, status="PROCESSING"),  # đang chấm: bỏ qua
        ])
        await s.commit()
    for denied in (HR, HM, CANDIDATE):
        assert (await client.post("/api/v1/ai/scores/rescore-all", headers=denied)).status_code == 403
    r = await client.post("/api/v1/ai/scores/rescore-all", headers=ADMIN)
    assert r.status_code == 200
    assert r.json() == {"total": 4, "withCv": 3, "queued": 2, "skipped": 1, "noCv": 1}
    assert sorted(state["scheduled"]) == [1, 3] and state["list_args"] == [None]
    async with factory() as s:
        rows = {x.application_id: x for x in (await s.execute(select(AIScore))).scalars()}
    assert rows[1].status == "PENDING" and rows[3].status == "PENDING" and rows[2].status == "PROCESSING"


async def test_cv_extractions_returns_cv_facts(api, factory):
    client, _ = api
    facts = {"facts": [{"category": "SKILLS", "quote": "Java", "note": "Kỹ năng"}], "limitations": []}
    async with factory() as s:
        s.add(CVFactsRecord(file_hash="h", prompt_version="ssrc-cv-extract-v1", resume_url="https://b/candidates/9/cv.pdf",
                            candidate_id=9, status="COMPLETED", model="m", result=facts,
                            provenance={"model": "m"}, text_metadata={}))
        await s.commit()
    r = await client.get("/api/v1/ai/cv-extractions", params={"applicationId": 1}, headers=HM)
    body = r.json()
    assert r.status_code == 200 and body["status"] == "success" and body["result"] == facts
    assert (await client.post("/api/v1/ai/cv-extractions/re-extract", params={"applicationId": 1},
                              headers=HM)).status_code == 403


def test_failed_cv_facts_row_shows_vietnamese_message():
    from app.api.cv_extraction import to_response
    row = CVFactsRecord(id=3, file_hash="h2", prompt_version="ssrc-cv-extract-v1", status="FAILED",
                        error_code="CITATION_MISMATCH", error_message="CitationError: raw detail")
    body = to_response(row)
    assert body["status"] == "error" and body["result"] is None
    assert body["error_message"] == "AI trích dẫn không khớp nội dung CV/JD, vui lòng chấm lại."
    assert "raw detail" not in str(body)


async def test_removed_endpoints_are_gone(api):
    client, _ = api
    for path in ("/api/v1/ai/extract-cv/upload", "/api/v1/ai/extract-text", "/api/v1/ai/extract-text/upload"):
        assert (await client.post(path, headers=HR)).status_code in (404, 405)
