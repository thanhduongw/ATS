"""Chấm điểm v2: lọc hồ sơ (chấm mù), prompt, score_candidate, luồng chấm trên Postgres thật (có bước JD), worker, API."""

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
from app.models import AIJob, AIScore, CVExtraction, JDExtraction
from app.schemas.jd_extraction import (
    EducationRequirement,
    ExperienceRequirement,
    ExtractedJD,
    Importance,
    RequirementItem,
)
from app.schemas.scoring import ScoringDimension as D, Tier
from app.schemas.scoring_llm import LLMScoringOutput
from app.services import application_scoring as svc
from app.services.prompts.cv_extraction import PROMPT_VERSION as EXTRACTION_PROMPT_VERSION
from app.services.scoring.aggregate import Thresholds
from app.services.scoring.engine import score_candidate
from app.services.scoring.profile import build_scoring_profile
from app.services.scoring.prompt import JobInfo, build_scoring_prompt
from app.services.scoring.rules import items_to_check

pytestmark = pytest.mark.anyio
TODAY = date(2026, 10, 15)


@pytest.fixture
def anyio_backend():
    return "asyncio"


# date_of_birth / gender: mô phỏng dữ liệu cũ (prompt trích xuất ≤ v1.2) còn trong bảng cv_extractions —
# hồ sơ chấm điểm vẫn phải loại ra (từ v1.3 schema không còn hai trường này).
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

# Danh sách yêu cầu sau trích xuất JD (Bước 1) của JOB — LLM giả trả về bản này.
JD = ExtractedJD(
    job_title="Backend Developer (Java)",
    skills=[RequirementItem(name="Java", importance=Importance.REQUIRED),
            RequirementItem(name="Spring Boot", importance=Importance.REQUIRED)],
    tasks=["Phát triển API thanh toán"],
    experience=ExperienceRequirement(min_years=3, importance=Importance.REQUIRED),
    education=EducationRequirement(degree_text="Đại học", fields=["Công nghệ thông tin"], importance=Importance.REQUIRED),
    domains=[RequirementItem(name="Fintech", importance=Importance.PREFERRED)],
)


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
    prompt = build_scoring_prompt(JD, profile, TODAY, 7.8, 6, items_to_check(JD))
    assert "Ngày hiện tại: 2026-10-15" in prompt
    assert "7.8 năm" in prompt and "tự ghi trong CV: 6 năm" in prompt
    assert '"name": "Spring Boot"' in prompt and "Nguyễn Văn An" not in prompt
    assert prompt.index("<job_requirements>\n") < prompt.index("<candidate_profile>\n")


def test_job_info_excludes_benefits():
    job = JobInfo.from_posting({"title": "Dev", "description": "D", "requirements": "R", "benefits": "Lương 50 triệu"})
    assert "50 triệu" not in job.as_text()


# ============================================================
# score_candidate (LLM giả)
# ============================================================

def llm_out(levels=None, checks=None, summary="Tóm tắt.") -> LLMScoringOutput:
    levels = {"TECHNICAL_SKILLS": 3, "RELEVANT_EXPERIENCE": 3, "DOMAIN": 3, **(levels or {})}
    if checks is None:
        checks = {"Java": "MET", "Spring Boot": "MET"}
    return LLMScoringOutput.model_validate({
        "dimensions": [{"dimension": d, "applicable": True, "level": lv, "evidence": ["Java"], "reason": f"lý do {d}"}
                       for d, lv in levels.items()],
        "education_field": {"match": "EXACT", "evidence": "CNTT"},
        "requirement_checks": [{"requirement": n, "category": "SKILL", "status": st, "evidence": None}
                               for n, st in checks.items()],
        "summary": summary,
    })


class ScoringLLM(BaseLLMClient):
    """LLM giả cho cả hai lời gọi: trích xuất JD (ExtractedJD) và chấm (LLMScoringOutput)."""

    def __init__(self, output=None, fail=False, fail_jd=False):
        super().__init__("fake-scorer")
        self.output, self.fail, self.fail_jd = output or llm_out(), fail, fail_jd
        self.prompts: list[str] = []
        self.jd_calls = 0

    def provider_name(self):
        return "fake"

    async def generate_structured(self, user_prompt, response_model, system_prompt=None):
        await asyncio.sleep(0.05)
        assert system_prompt is None
        if response_model is ExtractedJD:
            self.jd_calls += 1
            if self.fail_jd:
                raise LLMError("JD quota", provider="fake")
            return JD, LLMUsage(model=self.model, input_tokens=20, output_tokens=8)
        assert response_model is LLMScoringOutput
        self.prompts.append(user_prompt)
        if self.fail:
            raise LLMError("429 quota", provider="fake")
        return self.output, LLMUsage(model=self.model, input_tokens=10, output_tokens=5)


def manager(llm):
    m = LLMManager(primary=llm, use_fallback=False)
    m.BACKOFF_SECONDS = [0, 0]
    return m


async def test_score_candidate_end_to_end_with_fake_llm():
    llm = ScoringLLM()
    result, prov = await score_candidate(JD, EXTRACTED, manager(llm), TODAY, candidate_names=["Nguyễn Văn An"],
                                         extraction_id=3, extraction_prompt_version="v1.3",
                                         jd_extraction_id=8, jd_extraction_prompt_version="v1.0")
    assert result.years_calculated == pytest.approx(7.8, abs=0.1)   # 2019 → nay (15/10/2026)
    assert result.years_claimed == 6 and result.scored_on == TODAY
    assert "7.8 năm" in llm.prompts[0] and "Nguyễn Văn An" not in llm.prompts[0]
    # Kỹ năng 3, Kinh nghiệm 3, Số năm 4 (7,8 năm vs 3 năm: cao hơn 2 khoảng), Học vấn 3 (Cử nhân = bậc 6), Lĩnh vực 3
    levels = {d.dimension: d.level for d in result.dimensions}
    assert levels == {D.TECHNICAL_SKILLS: 3, D.RELEVANT_EXPERIENCE: 3, D.SENIORITY: 4,
                      D.EDUCATION_CERTIFICATION: 3, D.DOMAIN: 3}
    assert result.total_score == 80 and result.tier == Tier.FIT
    assert result.comment.startswith("Gợi ý: Phù hợp (80/100).") and result.comment.endswith("Tóm tắt.")
    assert result.threshold == 62.5 and result.uncertainty == 5.0
    assert prov.prompt_version == "v2.0" and prov.scoring_version == "v2.0" and prov.model == "fake-scorer"
    assert prov.extraction_id == 3 and prov.jd_extraction_id == 8 and prov.jd_extraction_prompt_version == "v1.0"


async def test_score_candidate_unmet_requirement_not_fit():
    llm = ScoringLLM(llm_out(checks={"Java": "MET", "Spring Boot": "UNMET"}))
    result, _ = await score_candidate(JD, EXTRACTED, manager(llm), TODAY)
    assert result.tier == Tier.NOT_FIT and "Spring Boot" in result.tier_reason


async def test_score_candidate_custom_thresholds():
    result, _ = await score_candidate(JD, EXTRACTED, manager(ScoringLLM()), TODAY,
                                      thresholds=Thresholds(threshold=90, uncertainty=5))
    assert result.total_score == 80 and result.tier == Tier.NOT_FIT


async def test_no_work_experience_is_zero_years():
    cv = {**EXTRACTED, "work_experience": []}
    result, _ = await score_candidate(JD, cv, manager(ScoringLLM()), TODAY)
    seniority = next(d for d in result.dimensions if d.dimension == D.SENIORITY)
    assert result.years_calculated == 0.0 and seniority.level == 0
    assert result.tier == Tier.NOT_FIT                     # yêu cầu 3 năm Không đạt


async def test_work_experience_without_dates_is_unknown():
    cv = {**EXTRACTED, "work_experience": [{"company": "ABC", "title": "Dev"}]}
    result, _ = await score_candidate(JD, cv, manager(ScoringLLM()), TODAY)
    seniority = next(d for d in result.dimensions if d.dimension == D.SENIORITY)
    assert result.years_calculated is None and seniority.level is None
    assert result.tier == Tier.UNCLASSIFIED                # yêu cầu 3 năm Không xác định được


async def test_degree_inferred_from_institution_meets_required_education():
    """CV chỉ ghi tên trường (đã học xong), JD bắt buộc "Đại học" -> yêu cầu bậc học Đạt, có ghi chú suy luận."""
    cv = {**EXTRACTED, "education": [{"institution": "Đại học Bách Khoa TP.HCM", "start_date": "2016", "end_date": "2020"}]}
    result, _ = await score_candidate(JD, cv, manager(ScoringLLM()), TODAY)
    edu_req = next(r for r in result.requirements if r.category.value == "EDUCATION_LEVEL")
    assert edu_req.status.value == "MET" and "suy từ tên trường" in edu_req.evidence
    assert result.tier == Tier.FIT


async def test_scoring_llm_error_propagates():
    with pytest.raises(LLMError):
        await score_candidate(JD, EXTRACTED, manager(ScoringLLM(fail=True)), TODAY)


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
            for t in (CVExtraction, JDExtraction, AIJob, AIScore):
                await conn.run_sync(lambda c, t=t: t.__table__.create(c, checkfirst=True))
            await conn.execute(delete(AIScore))
            await conn.execute(delete(AIJob))
            await conn.execute(delete(CVExtraction))
            await conn.execute(delete(JDExtraction))
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
    monkeypatch.setattr(svc, "_publish_status", publish)
    return state


async def test_scores_application(factory, java):
    llm = ScoringLLM()
    score = await svc.score_application(1, session_factory=factory, manager=manager(llm))
    assert score.status == "COMPLETED" and float(score.total_score) == 80.0 and score.tier == "FIT"
    assert score.result["comment"].startswith("Gợi ý: Phù hợp (80/100).")
    assert score.result["tier_label"] == "Phù hợp" and len(score.result["dimensions"]) == 5
    assert {r["requirement"] for r in score.result["requirements"]} >= {"Java", "Spring Boot"}
    assert score.provenance["jd_extraction_id"] is not None and score.provenance["prompt_version"] == "v2.0"
    assert score.cv_extraction_id is not None and score.ai_job_id is not None
    assert java["published"] == [(1, "PROCESSING"), (1, "COMPLETED")]
    assert llm.jd_calls == 1
    async with factory() as s:
        job = await s.get(AIJob, score.ai_job_id)
        assert job.status == "COMPLETED" and job.scoring_prompt_version == "v2.0" and job.completed_at
        jd_row = (await s.execute(select(JDExtraction))).scalar_one()
        assert jd_row.job_posting_id == 5 and jd_row.status == "COMPLETED"


async def test_jd_extraction_reused_for_second_application(factory, java):
    llm = ScoringLLM()
    await svc.score_application(1, session_factory=factory, manager=manager(llm))
    second = await svc.score_application(2, session_factory=factory, manager=manager(llm))
    assert second.status == "COMPLETED" and llm.jd_calls == 1 and len(llm.prompts) == 2


async def test_jd_extraction_failure_recorded_then_retried(factory, java):
    failed = await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM(fail_jd=True)))
    assert failed.status == "FAILED" and "Không trích xuất được JD" in failed.error_message
    assert failed.total_score is None and java["published"][-1] == (1, "FAILED")
    ok = await svc.score_application(1, session_factory=factory, manager=manager(ScoringLLM()))
    assert ok.status == "COMPLETED"


async def test_unclassified_is_completed(factory, java):
    """Chưa phân loại vẫn là lần chấm thành công (COMPLETED), không phải FAILED."""
    llm = ScoringLLM(llm_out(checks={"Java": "MET", "Spring Boot": "UNKNOWN"}))
    score = await svc.score_application(1, session_factory=factory, manager=manager(llm))
    assert score.status == "COMPLETED" and score.tier == "UNCLASSIFIED"


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
    assert java["published"][-1] == (2, "PENDING")  # chỉ phát cho hồ sơ thực sự chuyển sang PENDING


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
        return AIScore(application_id=application_id, job_posting_id=5, status="COMPLETED", total_score=80, tier="FIT")

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
                      tier="UNCLASSIFIED", result={"comment": "x"}))
        await s.commit()
    r = await client.get("/api/v1/ai/scores/7", headers=HM)
    assert r.status_code == 200 and r.json()["totalScore"] == 66.5 and r.json()["tier"] == "UNCLASSIFIED"
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
