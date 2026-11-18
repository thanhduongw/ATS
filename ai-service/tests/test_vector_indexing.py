"""Embedding (chuẩn hoá, chia lô, thử lại) và đọc số năm từ văn bản CV — không DB, không gọi Gemini.
Dựng hồ sơ/đoạn Talent Pool: xem test_talent_profile.py."""

import math

import pytest

from app.services.experience_years import estimate_years
from app.services.embeddings import GeminiEmbedder, l2_normalize


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_estimate_years_merges_overlaps_and_handles_unreadable():
    from datetime import datetime
    now = datetime(2026, 11, 19)
    assert estimate_years(["01/2020 - 12/2020"], now) == 1.0
    assert estimate_years(["01/2020 - 12/2020", "06/2020 - 12/2020"], now) == 1.0  # chồng lấn chỉ tính một lần
    assert estimate_years(["2022 - nay"], now) == 4.9
    assert estimate_years(["làm việc tại FPT"], now) is None
    assert estimate_years(["2030 - 2031"], now) is None  # tương lai: bỏ


def test_years_come_from_the_work_section_of_the_cv_text():
    from datetime import datetime
    from app.services.experience_years import years_from_cv_text
    now = datetime(2026, 11, 19)
    cv = chr(10).join(["KINH NGHIỆM LÀM VIỆC", "Backend Developer - FPT", "03/2023 - 11/2026", "HỌC VẤN",
                       "Đại học IUH", "04/2020 - 04/2024", "KỸ NĂNG", "Java"])
    assert years_from_cv_text(cv, now) == 3.8  # không cộng thời gian học
    assert years_from_cv_text("Java developer", now) is None


def test_years_range_survives_lost_dash_and_name_skips_headings():
    from datetime import datetime
    from app.services.experience_years import years_from_cv_text
    from app.services.privacy import contact_identity
    cv = chr(10).join(["Bui Anh Vu", "Hà Nội", "KINH NGHIỆM LÀM VIỆC", "03/2024 03/2025", "Backend C# Developer", "KỸ NĂNG", "C#"])
    assert years_from_cv_text(cv, datetime(2026, 11, 19)) == 1.1
    assert contact_identity(cv)["name"] == "Bui Anh Vu"
    assert contact_identity(chr(10).join(["KINH NGHIỆM LÀM VIỆC", "Java"]))["name"] is None


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
