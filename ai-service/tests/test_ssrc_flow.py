"""Luồng chấm đầy đủ trên Postgres test thật, với service Java/S3/AI giả.

Cần Postgres (biến TEST_DATABASE_URL, mặc định ats_ai_test); không có thì bỏ qua.
"""
import os

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.llm_client import LLMUsage
from app.core.public_errors import CITATION_MESSAGE
from app.core.schema_migrate import migrate
from app.models import AIJob, AIScore, CVFactsRecord, JDFactsRecord
from app.schemas.extraction import ExtractionMetadata, TextExtractionResponse
from app.schemas.ssrc import CVFacts, Fact, JDFacts, Rating, Requirement, ScoreFour
from app.services import application_scoring as scoring
from app.services import facts_store

pytestmark = pytest.mark.anyio
TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai_test")
URL = "https://bucket.s3.ap-southeast-1.amazonaws.com/candidates/9/cv.pdf"
CV_TEXT = "Kinh nghiệm\nBackend Developer tại ABC (2021-2024)\nKỹ năng: Java, Spring Boot\n"
POSTING = {"id": 5, "title": "Java Developer", "experienceRequired": "2 năm",
           "description": "Phát triển dịch vụ backend", "requirements": "2 năm Java Spring Boot", "skillIds": []}


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


class FakeManager:
    def __init__(self, *outputs):
        self.outputs = list(outputs)
        self.calls = 0

    async def generate_structured(self, prompt, response_type, system_prompt=None):
        self.calls += 1
        assert self.outputs, "AI bị gọi nhiều hơn dự kiến"
        return self.outputs.pop(0), LLMUsage(model="fake-model", input_tokens=100, output_tokens=10,
                                             estimated_cost_usd=0.001, latency_ms=5)


JD_OUT = JDFacts(job_title="Java Developer", limitations=[], requirements=[
    Requirement(dimension="SKILLS", priority="REQUIRED", requirement="Java Spring Boot",
                quote="2 năm Java Spring Boot")])
CV_OUT = CVFacts(limitations=[], facts=[
    Fact(category="WORK_EXPERIENCE", quote="Backend Developer tại ABC (2021-2024)", note="3 năm backend"),
    Fact(category="SKILLS", quote="Java, Spring Boot", note="Kỹ năng chính")])


def rating(score, cv=(), jd=(), reason="Lý do ngắn gọn"):
    return Rating(score=score, reason=reason, cv_evidence=list(cv), jd_evidence=list(jd))


GOOD_SCORE = ScoreFour(
    work_experience=rating(4, ["Backend Developer tại ABC (2021-2024)"]),
    skills=rating(4, ["Java, Spring Boot"], ["2 năm Java Spring Boot"]),
    education=rating(3),
    certifications=rating(None, reason="N/A: JD không đề cập chứng chỉ"))
BAD_EVIDENCE = ScoreFour(
    work_experience=rating(4, ["Tôi từng làm ở Google"]),
    skills=rating(4, [], ["2 năm Java Spring Boot"]),
    education=rating(3),
    certifications=rating(None, reason="N/A: JD không đề cập chứng chỉ"))


@pytest.fixture
def fakes(monkeypatch):
    async def summary(application_id, headers=None):
        return {"jobPostingId": 5, "candidateId": 9, "candidateName": "Nguyễn Văn A", "resumeUrl": URL}

    async def posting(job_posting_id, headers=None):
        return POSTING

    async def skills(ids):
        return []

    async def download(resume_url):
        return b"%PDF fake bytes", "cv.pdf"

    async def extract_text(data, filename):
        return TextExtractionResponse(status="success", text=CV_TEXT, metadata=ExtractionMetadata(
            file_type="pdf", file_size_bytes=len(data), extraction_method="pymupdf", text_length=len(CV_TEXT),
            processing_time_ms=1))

    published = []

    async def publish(score):
        published.append((score.status, float(score.total_score) if score.total_score is not None else None))

    monkeypatch.setattr(scoring, "get_application_summary", summary)
    monkeypatch.setattr(scoring, "get_posting", posting)
    monkeypatch.setattr(scoring, "get_skill_names", skills)
    monkeypatch.setattr(scoring, "_publish_status", publish)
    monkeypatch.setattr(facts_store, "_download", download)
    monkeypatch.setattr(facts_store, "extract_text_from_bytes", extract_text)
    return published


async def test_full_flow_completed_and_cached_rescore(factory, fakes):
    manager = FakeManager(JD_OUT, CV_OUT, GOOD_SCORE)
    score = await scoring.score_application(1, session_factory=factory, manager=manager)
    assert score.status == "COMPLETED" and manager.calls == 3
    assert float(score.total_score) == 73.3 and score.tier == "FIT"
    result = score.result
    assert [c["key"] for c in result["criteria"]] == ["work_experience", "skills", "education", "certifications"]
    assert result["criteria"][3]["applicable"] is False and result["cert_policy"] == "NOT_SPECIFIED"
    assert result["tier_label"] == "Phù hợp" and result["injection_detected"] is False
    prov = score.provenance
    assert prov["prompt_versions"]["scoring"] == "ssrc-rubric-evidence-v1" and len(prov["prompt_hash"]) == 64
    assert prov["cv_facts_id"] == score.cv_facts_id and prov["jd_facts_id"] == score.jd_facts_id
    assert fakes[0][0] == "PROCESSING" and fakes[-1] == ("COMPLETED", 73.3)

    async with factory() as s:
        job = (await s.execute(select(AIJob))).scalar_one()
        # Lần đầu gọi cả 3 bước: token/chi phí cộng đủ ba lượt.
        assert job.status == "COMPLETED" and job.total_input_tokens == 300 and job.total_output_tokens == 30
        assert job.scoring_prompt_version == "ssrc-rubric-evidence-v1"
        assert (await s.execute(select(JDFactsRecord))).scalar_one().status == "COMPLETED"
        cv_row = (await s.execute(select(CVFactsRecord))).scalar_one()
        assert cv_row.candidate_id == 9 and cv_row.text_metadata.get("injection_detected") in (False, None)

    # Chấm lại: JD và CV dùng lại từ DB, chỉ tốn một lượt gọi AI (chấm điểm).
    manager2 = FakeManager(GOOD_SCORE)
    again = await scoring.score_application(1, session_factory=factory, manager=manager2)
    assert again.status == "COMPLETED" and manager2.calls == 1


async def test_citation_failure_gives_failed_with_public_message(factory, fakes):
    manager = FakeManager(JD_OUT, CV_OUT, BAD_EVIDENCE, BAD_EVIDENCE)
    score = await scoring.score_application(1, session_factory=factory, manager=manager)
    assert score.status == "FAILED" and score.error_message == CITATION_MESSAGE
    assert score.total_score is None and score.result is None
    assert manager.calls == 4  # JD + CV + chấm + một lần hỏi lại
    async with factory() as s:
        job = (await s.execute(select(AIJob))).scalar_one()
        assert job.status == "FAILED" and "CitationError" in job.error_message


async def test_citation_retry_succeeds(factory, fakes):
    manager = FakeManager(JD_OUT, CV_OUT, BAD_EVIDENCE, GOOD_SCORE)
    score = await scoring.score_application(1, session_factory=factory, manager=manager)
    assert score.status == "COMPLETED" and score.provenance["validation_retries"] == 1


async def test_purge_candidate_data_keeps_score_and_tier(factory, fakes):
    await scoring.score_application(1, session_factory=factory, manager=FakeManager(JD_OUT, CV_OUT, GOOD_SCORE))
    removed = await scoring.purge_candidate_data(9, session_factory=factory)
    assert removed == 1
    async with factory() as s:
        row = (await s.execute(select(AIScore))).scalar_one()
        assert row.status == "COMPLETED" and float(row.total_score) == 73.3 and row.tier == "FIT"
        assert row.result is None and row.provenance is None and row.cv_facts_id is None
        assert (await s.execute(select(CVFactsRecord))).first() is None
        assert (await s.execute(select(JDFactsRecord))).first() is not None  # JD không phải dữ liệu cá nhân


async def test_scoring_config_thresholds_are_read_from_settings(monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setenv("SCORING_FIT_THRESHOLD", "80")
    monkeypatch.setenv("SCORING_NOT_FIT_THRESHOLD", "55")
    get_settings.cache_clear()
    try:
        th = scoring.scoring_options()
        assert (th.fit, th.not_fit) == (80.0, 55.0)
    finally:
        monkeypatch.undo()
        get_settings.cache_clear()
    assert (scoring.scoring_options().fit, scoring.scoring_options().not_fit) == (70.0, 60.0)


async def test_mark_pending_include_completed(factory, fakes):
    await scoring.score_application(1, session_factory=factory, manager=FakeManager(JD_OUT, CV_OUT, GOOD_SCORE))
    apps = [{"id": 1, "jobPostingId": 5, "candidateId": 9}]
    await scoring.mark_pending(factory, apps)  # mặc định: không đụng hồ sơ COMPLETED
    async with factory() as s:
        assert (await s.execute(select(AIScore))).scalar_one().status == "COMPLETED"
    await scoring.mark_pending(factory, apps, include_completed=True)
    async with factory() as s:
        assert (await s.execute(select(AIScore))).scalar_one().status == "PENDING"


async def test_migration_is_idempotent_and_converts_legacy_schema():
    engine = create_async_engine(TEST_DB)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("DROP TABLE IF EXISTS ai_scores, ai_jobs, cv_facts, jd_facts, cv_extractions, "
                                    "jd_extractions, ai_feedback, cv_document_chunks CASCADE"))
            await conn.execute(text("CREATE TABLE cv_extractions (id bigserial primary key)"))
            await conn.execute(text("CREATE TABLE ai_feedback (id bigserial primary key)"))
            await conn.execute(text(
                "CREATE TABLE ai_jobs (id bigserial primary key, application_id bigint not null, "
                "candidate_id bigint not null, job_posting_id bigint not null, status varchar(50) not null, "
                "extraction_prompt_version varchar(20), scoring_prompt_version varchar(20))"))
            await conn.execute(text(
                "CREATE TABLE ai_scores (id bigserial primary key, application_id bigint not null unique, "
                "job_posting_id bigint not null, candidate_id bigint not null, "
                "cv_extraction_id bigint references cv_extractions(id), ai_job_id bigint references ai_jobs(id), "
                "status varchar(20) not null)"))
    except Exception as exc:  # noqa: BLE001
        await engine.dispose()
        pytest.skip(f"Không kết nối được Postgres test: {exc}")
    try:
        await migrate(engine)
        await migrate(engine)  # chạy lần hai không lỗi
        async with engine.connect() as conn:
            cols = {r[0] for r in await conn.execute(text(
                "select column_name from information_schema.columns where table_name='ai_scores'"))}
            tables = {r[0] for r in await conn.execute(text(
                "select table_name from information_schema.tables where table_schema='public'"))}
            width = (await conn.execute(text(
                "select character_maximum_length from information_schema.columns "
                "where table_name='ai_jobs' and column_name='scoring_prompt_version'"))).scalar()
        assert {"cv_facts_id", "jd_facts_id"} <= cols and "cv_extraction_id" not in cols
        assert "cv_extractions" not in tables and "ai_feedback" not in tables
        assert {"cv_facts", "jd_facts"} <= tables and width == 40
    finally:
        await engine.dispose()
