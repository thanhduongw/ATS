"""Giai đoạn 2: chấm điểm — lọc hồ sơ (chấm mù), prompt, tính điểm, luồng chấm trên Postgres thật, worker, API."""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.java_services import JavaServiceError
from app.core.llm_client import BaseLLMClient, LLMError, LLMManager, LLMUsage
from app.models import AIJob, AIScore, CVExtraction
from app.schemas.scoring import DimensionAssessment, LLMScoringOutput, ScoringDimension as D, Tier
from app.services import application_scoring as svc
from app.services.prompts.cv_extraction import PROMPT_VERSION as EXTRACTION_PROMPT_VERSION
from app.services.scoring.engine import (
    NoApplicableDimensionError,
    ScoringOptions,
    Thresholds,
    compute_score,
    score_candidate,
)
from app.services.scoring.profile import build_scoring_profile
from app.services.scoring.prompt import JobInfo, build_scoring_prompt

pytestmark = pytest.mark.anyio
TODAY = date(2026, 10, 15)


@pytest.fixture
def anyio_backend():
    return "asyncio"


EXTRACTED = {
    "candidate": {
        "name": "Nguyễn Văn An", "email": "an.nguyen@gmail.com", "phone": "0912 345 678",
        "location": "Quận 7, TP.HCM", "linkedin_url": "https://linkedin.com/in/an", "date_of_birth": "1999-05-20",
        "gender": "MALE",
        "summary": "Tôi là Nguyen Van An, backend developer. Liên hệ an.nguyen@gmail.com hoặc https://an.dev",
    },
    "skills": ["Java", "Spring Boot", "PostgreSQL"],
    "work_experience": [
        {"company": "ABC", "title": "Backend Developer", "start_date": "2019", "end_date": "2023",
         "is_current": False, "description": "2018 - 2022 xây dựng hệ thống thanh toán 1 500 000 USD/ngày",
         "technologies": ["Java"], "source_text": "Nguyễn Văn An — ABC 2019-2023 — 0912 345 678"},
        {"company": "XYZ Fintech", "title": "Senior Developer", "start_date": "2023", "end_date": "nay",
         "is_current": True, "description": None, "technologies": []},
    ],
    "education": [{"institution": "ĐH Công nghiệp", "degree": "Cử nhân", "field_of_study": "CNTT",
                   "source_text": "..."}],
    "certifications": [], "projects": [{"name": "Ví điện tử", "url": "https://github.com/an/wallet",
                                        "description": "Do Nguyễn Văn An phát triển", "technologies": ["Go"]}],
    "languages": [{"language": "English", "proficiency": "ADVANCED"}],
    "years_of_experience_claimed": 6,
    "field_confidences": [{"field_name": "name", "confidence": "HIGH", "evidence": "Nguyễn Văn An"}],
}

JOB = JobInfo(title="Backend Developer (Java)", experience_required="3 năm",
              description="Phát triển API thanh toán", requirements="Bắt buộc: Java, Spring Boot. Ưu tiên fintech.")


# ============================================================
# Lọc hồ sơ / prompt
# ============================================================

def test_profile_drops_personal_fields_and_redacts_free_text():
    profile = build_scoring_profile(EXTRACTED, ["Nguyễn Văn An"])
    text = json.dumps(profile, ensure_ascii=False)
    for leaked in ("0912", "Quận 7", "1999-05-20", "MALE", "linkedin", "gmail", "an.dev", "github.com",
                   "Nguyễn Văn An", "Nguyen Van An", "field_confidences", "source_text"):
        assert leaked not in text, leaked
    assert "[ứng viên]" in profile["summary"]
    # Mốc thời gian và số liệu KHÔNG bị che nhầm (lỗi của bản trước dùng regex số điện thoại)
    assert "2018 - 2022" in profile["work_experience"][0]["description"]
    assert "1 500 000 USD" in profile["work_experience"][0]["description"]
    assert profile["work_experience"][1]["end_date"] == "nay"
    assert profile["years_of_experience_claimed"] == 6


def test_prompt_single_message_contents():
    profile = build_scoring_profile(EXTRACTED, ["Nguyễn Văn An"])
    prompt = build_scoring_prompt(JOB, profile, TODAY, 7.8, 6)
    assert "Ngày hiện tại: 2026-10-15" in prompt
    assert "7.8 năm" in prompt and "tự ghi trong CV: 6 năm" in prompt
    assert "Bắt buộc: Java" in prompt and "Nguyễn Văn An" not in prompt
    assert prompt.index("<job_description>") < prompt.index("<candidate_profile>")


def test_job_info_excludes_benefits():
    job = JobInfo.from_posting({"title": "Dev", "description": "D", "requirements": "R", "benefits": "Lương 50 triệu"})
    assert "50 triệu" not in job.as_text()


# ============================================================
# Tính điểm
# ============================================================

def out(levels: dict, must=(), summary="Ứng viên phù hợp."):
    dims = [DimensionAssessment(dimension=d, applicable=lv is not None, level=lv or 0, reason=f"lý do {d.value}")
            for d, lv in levels.items()]
    return LLMScoringOutput(dimensions=dims, must_have_unmet=list(must), summary=summary)


ALL3 = {D.TECHNICAL_SKILLS: 3, D.RELEVANT_EXPERIENCE: 3, D.SENIORITY: 3, D.EDUCATION_CERTIFICATION: 3, D.DOMAIN: 3}


def test_weighted_total_and_tier():
    r = compute_score(out({**ALL3, D.TECHNICAL_SKILLS: 4}), TODAY)
    # 0.35*100 + 0.65*75 = 83.75
    assert r.total_score == 83.8 and r.tier == Tier.GOOD_FIT
    assert r.comment.startswith("Mức độ phù hợp: Phù hợp tốt (83.8/100).")
    assert sum(d.effective_weight for d in r.dimensions) == pytest.approx(1.0, abs=1e-3)


def test_not_applicable_dimension_reweighted():
    r = compute_score(out({**ALL3, D.DOMAIN: None, D.TECHNICAL_SKILLS: 4}), TODAY)
    domain = next(d for d in r.dimensions if d.dimension == D.DOMAIN)
    assert not domain.applicable and domain.score is None and domain.effective_weight == 0
    # (0.35*100 + 0.50*75) / 0.85 = 85.29
    assert r.total_score == 85.3


def test_missing_and_duplicate_dimensions():
    o = out({D.TECHNICAL_SKILLS: 2, D.SENIORITY: 2})
    o.dimensions.append(DimensionAssessment(dimension=D.TECHNICAL_SKILLS, applicable=True, level=4, reason="trùng"))
    r = compute_score(o, TODAY)
    assert r.total_score == 50.0  # bản trùng bị bỏ, khía cạnh thiếu = không áp dụng


@pytest.mark.parametrize("levels, tier", [
    ({D.TECHNICAL_SKILLS: 4, D.SENIORITY: 2}, Tier.GOOD_FIT),      # (0.35*100+0.15*50)/0.5 = 85
    ({D.TECHNICAL_SKILLS: 2}, Tier.POTENTIAL_FIT),                   # 50 — đúng ngưỡng dưới
    ({D.TECHNICAL_SKILLS: 1}, Tier.NOT_FIT),                         # 25
])
def test_tier_boundaries(levels, tier):
    assert compute_score(out(levels), TODAY).tier == tier


def test_custom_thresholds():
    opts = ScoringOptions(thresholds=Thresholds(good_min=90, potential_min=80))
    assert compute_score(out(ALL3), TODAY, opts).tier == Tier.NOT_FIT


def test_must_have_only_warns():
    r = compute_score(out({**ALL3, D.TECHNICAL_SKILLS: 4}, must=["Chứng chỉ AWS"]), TODAY)
    assert r.total_score == 83.8 and r.tier == Tier.GOOD_FIT  # không trừ điểm, không chặn trần
    assert "Chưa đáp ứng yêu cầu bắt buộc: Chứng chỉ AWS." in r.comment


def test_no_applicable_dimension():
    with pytest.raises(NoApplicableDimensionError):
        compute_score(out({D.DOMAIN: None}), TODAY)


class ScoringLLM(BaseLLMClient):
    def __init__(self, levels=None, fail=False):
        super().__init__("fake-scorer")
        self.levels, self.fail, self.prompts = levels or ALL3, fail, []

    def provider_name(self):
        return "fake"

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        self.prompts.append(user_prompt)
        await asyncio.sleep(0.05)
        if self.fail:
            raise LLMError("429 quota", provider="fake")
        assert system_prompt is None and response_model is LLMScoringOutput
        return out(self.levels, summary="Tóm tắt."), LLMUsage(model=self.model, input_tokens=10, output_tokens=5)


def manager(llm):
    m = LLMManager(primary=llm, use_fallback=False)
    m.BACKOFF_SECONDS = [0, 0]
    return m


async def test_score_candidate_recomputes_years_with_today():
    llm = ScoringLLM()
    result, prov = await score_candidate(JOB, EXTRACTED, manager(llm), TODAY, candidate_names=["Nguyễn Văn An"],
                                         extraction_id=3, extraction_prompt_version="v1.1")
    assert result.years_calculated == pytest.approx(7.8, abs=0.1)   # 2019 → nay (15/10/2026)
    assert result.years_claimed == 6 and result.scored_on == TODAY
    assert "7.8 năm" in llm.prompts[0] and "Nguyễn Văn An" not in llm.prompts[0]
    assert prov.extraction_id == 3 and prov.prompt_version == "v1.0" and prov.model == "fake-scorer"


# ============================================================
# Luồng chấm hồ sơ (Postgres thật — DB riêng ats_ai_test)
# ============================================================

TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai_test")
URL = "https://bucket.s3.ap-southeast-1.amazonaws.com/candidates/9/cv.pdf"


@pytest.fixture
async def factory():
    engine = create_async_engine(TEST_DB)
    try:
        async with engine.begin() as conn:
            for t in (CVExtraction, AIJob, AIScore):
                await conn.run_sync(lambda c, t=t: t.__table__.create(c, checkfirst=True))
            await conn.execute(delete(AIScore))
            await conn.execute(delete(AIJob))
            await conn.execute(delete(CVExtraction))
    except Exception as exc:  # noqa: BLE001
        await engine.dispose()
        pytest.skip(f"Không kết nối được Postgres test: {exc}")
    f = async_sessionmaker(engine, expire_on_commit=False)
    async with f() as s:
        s.add(CVExtraction(file_hash="h", prompt_version=EXTRACTION_PROMPT_VERSION, resume_url=URL,
                           candidate_id=9, status="COMPLETED", model="m",
                           result={"extracted_cv": EXTRACTED}, text_metadata={"ocr_used": False}))
        await s.commit()
    yield f
    await engine.dispose()


@pytest.fixture
def java(monkeypatch):
    state = {"summary": {"id": 1, "jobPostingId": 5, "candidateId": 9, "candidateName": "Nguyễn Văn An",
                         "resumeUrl": URL},
             "posting": {"title": JOB.title, "requirements": JOB.requirements}, "published": []}

    async def summary(application_id, headers=None):
        if state["summary"] is None:
            raise JavaServiceError("down", 503)
        return {**state["summary"], "id": application_id}

    async def posting(job_posting_id, headers=None):
        if state["posting"] is None:
            raise JavaServiceError("posting closed", 400)
        return state["posting"]

    async def publish(score):
        state["published"].append((score.application_id, score.status))

    monkeypatch.setattr(svc, "get_application_summary", summary)
    monkeypatch.setattr(svc, "get_posting", posting)
    monkeypatch.setattr(svc, "_publish_completed", publish)
    return state


async def test_scores_application(factory, java):
    score = await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))
    assert score.status == "COMPLETED" and float(score.total_score) == 75.0 and score.tier == "GOOD_FIT"
    assert score.result["comment"].startswith("Mức độ phù hợp: Phù hợp tốt (75/100).")
    assert score.cv_extraction_id is not None and score.ai_job_id is not None
    assert java["published"] == [(1, "COMPLETED")]
    async with factory() as s:
        job = await s.get(AIJob, score.ai_job_id)
        assert job.status == "COMPLETED" and job.scoring_prompt_version == "v1.0" and job.completed_at


async def test_failure_clears_previous_score(factory, java):
    await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))
    failed = await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM(fail=True)))
    assert failed.status == "FAILED" and failed.total_score is None and failed.result is None
    assert "Lỗi gọi AI" in failed.error_message
    async with factory() as s:
        assert len((await s.execute(select(AIScore))).scalars().all()) == 1


@pytest.mark.parametrize("change, expected", [
    ({"summary": {"resumeUrl": None}}, "không có CV"),
    ({"posting": None}, "tin tuyển dụng"),
])
async def test_failures_recorded(factory, java, change, expected):
    if "summary" in change:
        java["summary"] = {**java["summary"], **change["summary"]}
    else:
        java["posting"] = None
    score = await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))
    assert score.status == "FAILED" and expected in score.error_message


async def test_failed_extraction_recorded(factory, java, monkeypatch):
    from app.services import cv_extraction_store as store

    async with factory() as s:
        row = (await s.execute(select(CVExtraction))).scalar_one()
        row.status, row.result, row.error_message = "FAILED", None, "File hỏng"
        await s.commit()

    # Bản trích xuất FAILED được thử lại: tải lại file — file vẫn hỏng → vẫn FAILED
    async def broken_file(url):
        return b"not a cv", "cv.pdf"
    monkeypatch.setattr(store, "_download", broken_file)
    score = await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))
    assert score.status == "FAILED" and "Không trích xuất được CV" in score.error_message


async def test_summary_failure_raises(factory, java):
    java["summary"] = None
    with pytest.raises(JavaServiceError):
        await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))


async def test_concurrent_scoring_one_wins(factory, java):
    results = await asyncio.gather(
        *[svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM())) for _ in range(3)],
        return_exceptions=True)
    done = [r for r in results if isinstance(r, AIScore)]
    busy = [r for r in results if isinstance(r, svc.ScoringInProgressError)]
    assert len(done) == 1 and len(busy) == 2


async def test_stale_processing_can_be_reclaimed(factory, java):
    async with factory() as s:
        s.add(AIScore(application_id=1, job_posting_id=5, candidate_id=9, status="PROCESSING",
                      updated_at=datetime.utcnow() - timedelta(minutes=30)))
        await s.commit()
    score = await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))
    assert score.status == "COMPLETED"


async def test_mark_pending_keeps_completed(factory, java):
    await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))
    await svc.mark_pending(factory, [{"id": 1, "jobPostingId": 5, "candidateId": 9},
                                     {"id": 2, "jobPostingId": 5, "candidateId": 10}])
    async with factory() as s:
        status = {r.application_id: r.status for r in (await s.execute(select(AIScore))).scalars()}
    assert status == {1: "COMPLETED", 2: "PENDING"}


# ============================================================
# Worker
# ============================================================

class FakeMessage:
    def __init__(self, body: bytes):
        self.body = body

    @asynccontextmanager
    async def process(self, ignore_processed=False):
        yield


async def test_worker_ignores_bad_message_and_swallows_errors(monkeypatch):
    from app.workers import scoring_worker as w

    called = []

    async def fake_score(application_id, headers=None):
        called.append(application_id)
        raise RuntimeError("boom")

    monkeypatch.setattr(w, "score_application", fake_score)
    await w._handle(FakeMessage(b"not json"))
    await w._handle(FakeMessage(json.dumps({"applicationId": 42}).encode()))
    assert called == [42]


# ============================================================
# API
# ============================================================

HR = {"X-User-Id": "2", "X-User-Email": "hr@x", "X-User-Role": "RECRUITER"}
HM = {"X-User-Id": "3", "X-User-Email": "hm@x", "X-User-Role": "HIRING_MANAGER", "X-Department-Id": "1"}


@asynccontextmanager
async def _no_lifespan(_app):
    yield


@pytest.fixture
async def api(factory, monkeypatch):
    from app.api import access, application_scores as routes
    from app.core.database import get_db
    from app.main import create_app

    state = {"scheduled": [], "applications": []}

    async def summary(application_id, headers=None):
        if application_id == 403:
            raise JavaServiceError("denied", 403)
        return {"id": application_id}

    async def fake_score(application_id, headers=None):
        if application_id == 409:
            raise svc.ScoringInProgressError("busy")
        return AIScore(application_id=application_id, job_posting_id=5, status="COMPLETED", total_score=80, tier="GOOD_FIT")

    async def apps(job_posting_id, headers):
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
    app = create_app()
    app.router.lifespan_context = _no_lifespan
    app.dependency_overrides[get_db] = db
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t"), state


async def test_api_get_score(api, factory):
    client, _ = api
    r = await client.get("/api/v1/ai/scores/7", headers=HM)
    assert r.status_code == 404
    async with factory() as s:
        s.add(AIScore(application_id=7, job_posting_id=5, candidate_id=9, status="COMPLETED", total_score=66.5,
                      tier="POTENTIAL_FIT", result={"comment": "x"}))
        await s.commit()
    r = await client.get("/api/v1/ai/scores/7", headers=HM)
    assert r.status_code == 200 and r.json()["totalScore"] == 66.5 and r.json()["tier"] == "POTENTIAL_FIT"
    assert (await client.get("/api/v1/ai/scores/403", headers=HM)).status_code == 403


async def test_api_rescore_hr_only(api):
    client, _ = api
    assert (await client.post("/api/v1/ai/scores/7/rescore", headers=HM)).status_code == 403
    r = await client.post("/api/v1/ai/scores/7/rescore", headers=HR)
    assert r.status_code == 200 and r.json()["totalScore"] == 80.0
    assert (await client.post("/api/v1/ai/scores/409/rescore", headers=HR)).status_code == 409


async def test_api_rescore_posting_queues_missing_failed_and_stale(api, factory):
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
    assert r.json() == {"jobPostingId": 5, "total": 5, "queued": 3, "skipped": 2}
    assert sorted(state["scheduled"]) == [2, 4, 5]


def test_scoring_package_has_no_db_or_queue_imports():
    """Gói chấm điểm phải chạy được trên Kaggle — không kéo theo DB / RabbitMQ / S3."""
    import subprocess
    import sys

    code = ("import sys, app.services.scoring.engine; "
            "print(sorted(m for m in sys.modules if m.split('.')[0] in "
            "('sqlalchemy', 'asyncpg', 'aio_pika', 'boto3', 'app.models', 'app.core.database')))")
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True).stdout
    assert out.strip() == "[]"
