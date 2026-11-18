"""Lập chỉ mục vector: dựng đoạn văn bản từ kết quả trích xuất CV và chuẩn hoá embedding — không DB, không gọi Gemini."""

import math

import pytest

from app.services.cv_indexing import (
    CERTIFICATION, EDUCATION, PROJECT, SKILLS, SUMMARY, WORK_EXPERIENCE, build_cv_profile,
)
from app.services.embeddings import GeminiEmbedder, l2_normalize


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _result(**overrides) -> dict:
    cv = {
        "candidate": {
            "name": "Nguyễn Văn A", "email": "a@example.com", "phone": "0901234567",
            "location": "123 Đường X, Hà Nội", "linkedin_url": "https://linkedin.com/in/a",
            "github_url": "https://github.com/a", "summary": "Backend developer yêu thích hệ thống phân tán.",
        },
        "skills": ["Java", "Kafka", "java", "Spring Boot"],
        "work_experience": [
            {"company": "FPT", "title": "Backend Developer", "start_date": "2021", "end_date": None,
             "is_current": True, "description": "Xây dựng microservice.", "technologies": ["Java", "Kafka"]},
            {"company": "VNG", "title": "Junior Developer", "start_date": "2019", "end_date": "2021",
             "is_current": False, "description": None, "technologies": []},
        ],
        "education": [{"institution": "IUH", "degree": "Cử nhân", "field_of_study": "Công nghệ thông tin"}],
        "certifications": [{"name": "AWS SAA", "issuer": "Amazon"}],
        "projects": [{"name": "ATS", "role": "Backend", "description": "Hệ thống tuyển dụng", "technologies": ["Spring"]}],
        "years_of_experience_claimed": 2.0,
    }
    out = {"extracted_cv": cv, "years_of_experience_calculated": 5.5}
    out.update(overrides)
    return out


def test_chunk_types_and_filter_fields():
    p = build_cv_profile(_result())
    types = [c.chunk_type for c in p.chunks]
    assert types[0] == SUMMARY and SKILLS in types
    assert types.count(WORK_EXPERIENCE) == 2
    assert PROJECT in types and EDUCATION in types and CERTIFICATION in types
    assert p.total_years == 5.5
    assert p.skills == ["Java", "Kafka", "Spring Boot"]  # bỏ trùng không phân biệt hoa thường
    assert p.titles == ["Backend Developer", "Junior Developer"]


def test_no_personal_contact_data_in_embedded_text():
    p = build_cv_profile(_result())
    everything = p.doc_text + " ".join(c.content for c in p.chunks)
    for secret in ("Nguyễn Văn A", "a@example.com", "0901234567", "Đường X", "linkedin.com", "github.com"):
        assert secret not in everything


def test_years_fall_back_to_claimed_then_none():
    r = _result(years_of_experience_calculated=None)
    assert build_cv_profile(r).total_years == 2.0
    r["extracted_cv"]["years_of_experience_claimed"] = None
    assert build_cv_profile(r).total_years is None


def test_current_job_period_says_present():
    p = build_cv_profile(_result())
    current = next(c for c in p.chunks if c.chunk_type == WORK_EXPERIENCE)
    assert "hiện tại" in current.content and "FPT" in current.content


def test_empty_cv_has_no_chunks():
    p = build_cv_profile({"extracted_cv": {"candidate": {}}})
    assert p.chunks == [] and p.doc_text == "" and p.skills == []


def test_chunk_and_doc_length_are_capped():
    r = _result()
    r["extracted_cv"]["work_experience"][0]["description"] = "x " * 5000
    p = build_cv_profile(r)
    assert all(len(c.content) <= 2000 for c in p.chunks)
    assert len(p.doc_text) <= 4000


def test_l2_normalize():
    v = l2_normalize([3.0, 4.0])
    assert v == pytest.approx([0.6, 0.8])
    assert math.sqrt(sum(x * x for x in v)) == pytest.approx(1.0)
    assert l2_normalize([0.0, 0.0]) == [0.0, 0.0]


class _FakeEmbedding:
    def __init__(self, values):
        self.values = values


class _FakeResponse:
    def __init__(self, n, dim):
        self.embeddings = [_FakeEmbedding([3.0] + [0.0] * (dim - 1)) for _ in range(n)]


class _FakeModels:
    def __init__(self, dim, fail_times=0):
        self.dim, self.calls, self.fail_times = dim, [], fail_times

    async def embed_content(self, *, model, contents, config):
        self.calls.append(list(contents))
        if self.fail_times > 0:
            self.fail_times -= 1
            raise RuntimeError("503 overloaded")
        return _FakeResponse(len(contents), self.dim)


def _embedder(models, batch=2, dim=4):
    e = GeminiEmbedder("gemini-embedding-001", dim, batch)

    class _Aio:
        pass

    class _Client:
        aio = _Aio()
    _Client.aio.models = models
    e._client = _Client()
    return e


@pytest.mark.anyio
async def test_embedder_batches_and_normalizes():
    models = _FakeModels(dim=4)
    vectors = await _embedder(models).embed(["a", "b", "c", "d", "e"], "RETRIEVAL_DOCUMENT")
    assert [len(c) for c in models.calls] == [2, 2, 1]
    assert len(vectors) == 5 and vectors[0] == pytest.approx([1.0, 0, 0, 0])


@pytest.mark.anyio
async def test_embedder_retries_then_succeeds(monkeypatch):
    async def _no_sleep(_):
        return None
    monkeypatch.setattr("app.services.embeddings.asyncio.sleep", _no_sleep)
    models = _FakeModels(dim=4, fail_times=2)
    assert len(await _embedder(models, batch=10).embed(["a"], "RETRIEVAL_QUERY")) == 1
    assert len(models.calls) == 3


@pytest.mark.anyio
async def test_embedder_gives_up_after_max_attempts(monkeypatch):
    from app.services.embeddings import EmbeddingError

    async def _no_sleep(_):
        return None
    monkeypatch.setattr("app.services.embeddings.asyncio.sleep", _no_sleep)
    with pytest.raises(EmbeddingError):
        await _embedder(_FakeModels(dim=4, fail_times=99), batch=10).embed(["a"], "RETRIEVAL_QUERY")


@pytest.mark.anyio
async def test_embedder_rejects_wrong_dimension():
    from app.services.embeddings import EmbeddingError
    with pytest.raises(EmbeddingError):
        await _embedder(_FakeModels(dim=8), batch=10, dim=4).embed(["a"], "RETRIEVAL_QUERY")


def test_retry_wait_honors_gemini_retry_hint_and_caps():
    wait = GeminiEmbedder._retry_wait
    assert wait(Exception("429 ... Please retry in 38.150218396s. ..."), 1) == pytest.approx(39.15, abs=0.01)
    assert wait(Exception("retry in 500s"), 1) == 90            # có trần, không chờ vô hạn
    assert wait(Exception("503 overloaded"), 2) == 4.0          # không có gợi ý → lùy thừa 2


@pytest.mark.anyio
async def test_embedder_splits_batches_by_token_budget():
    # hạn mức 100 token/phút → mỗi lô tối đa 50 token; mỗi văn bản 90 ký tự ≈ 30 token → mỗi lô một văn bản
    models = _FakeModels(dim=4)
    e = _embedder(models, batch=50)
    e._tokens_per_minute = 100
    texts = ["x" * 90, "y" * 90, "z" * 90]
    vectors = await e.embed(texts, "RETRIEVAL_DOCUMENT")
    assert [len(c) for c in models.calls] == [1, 1, 1] and len(vectors) == 3


@pytest.mark.anyio
async def test_throttle_waits_when_window_is_full(monkeypatch):
    sleeps = []

    async def fake_sleep(s):
        sleeps.append(s)
        e._window.clear()   # mô phỏng cửa sổ 60 giây đã trôi qua

    monkeypatch.setattr("app.services.embeddings.asyncio.sleep", fake_sleep)
    e = _embedder(_FakeModels(dim=4))
    e._tokens_per_minute = 100
    await e._throttle(80)
    await e._throttle(80)       # 80 + 80 > 100 → phải chờ
    assert len(sleeps) == 1 and 0.5 <= sleeps[0] <= 60
