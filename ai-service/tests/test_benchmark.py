"""Benchmark: lấy mẫu không rò rỉ, runner Kaggle (giả lập kaggle_benchmarks), chạy lại tiếp, notebook chạy được."""

from __future__ import annotations

import contextlib
import hashlib
import json
import re
import shutil
import sys
import types
import zipfile
from pathlib import Path

import pytest

from benchmark import kaggle_runner as kr
from benchmark.common import BUILD_DIR, DATA_DIR, read_jsonl

ROOT = Path(__file__).resolve().parents[1]
HAVE_DATA = (DATA_DIR / "pairs.jsonl").exists()


# ============================================================
# Giả lập kaggle_benchmarks
# ============================================================

class FakeKbench:
    """Trả kết quả tất định theo nội dung tin nhắn; đếm lời gọi; mô phỏng lỗi theo model."""

    def __init__(self, fail_models=(), fail_after: int | None = None):
        self.calls: list[tuple[str, str]] = []
        self.fail_models, self.fail_after = set(fail_models), fail_after
        self.open_chats = 0
        kb = self

        class Chats:
            @staticmethod
            @contextlib.contextmanager
            def new(name):
                kb.open_chats += 1
                try:
                    yield
                finally:
                    kb.open_chats -= 1

        class Llms(dict):
            def __missing__(self, model):
                return FakeLLM(kb, model)

        self.chats, self.llms = Chats, Llms()


class FakeLLM:
    def __init__(self, kb: FakeKbench, model: str):
        self.kb, self.model = kb, model

    def prompt(self, message, schema=str, seed=0, temperature=0):
        from app.schemas.cv_extraction import ExtractedCV
        from app.schemas.scoring import LLMScoringOutput

        assert self.kb.open_chats == 1, "mỗi lời gọi phải nằm trong kbench.chats.new()"
        self.kb.calls.append((self.model, message))
        if self.model in self.kb.fail_models or (
                self.kb.fail_after is not None and len(self.kb.calls) > self.kb.fail_after):
            raise RuntimeError("quota exceeded")
        h = int(hashlib.md5(message.encode()).hexdigest(), 16)
        if schema is str:
            src = re.search(r"<source>\n(.*)\n</source>", message, re.S).group(1)
            return "Bản dịch: " + src
        if schema is ExtractedCV:
            return ExtractedCV.model_validate({
                "candidate": {"name": "Test"}, "skills": ["Python"],
                "work_experience": [{"title": "Dev", "start_date": "2019", "end_date": "Present"}]})
        if schema is LLMScoringOutput:
            dims = ["TECHNICAL_SKILLS", "RELEVANT_EXPERIENCE", "SENIORITY", "EDUCATION_CERTIFICATION", "DOMAIN"]
            return LLMScoringOutput.model_validate({
                "dimensions": [{"dimension": d, "applicable": True, "level": (h >> i) % 5, "reason": "r"}
                               for i, d in enumerate(dims)],
                "must_have_unmet": [], "summary": "Tóm tắt."})
        raise AssertionError(schema)


@pytest.fixture
def fake_kbench(monkeypatch):
    kb = FakeKbench()
    monkeypatch.setitem(sys.modules, "kaggle_benchmarks", kb)
    return kb


# ============================================================
# Lấy mẫu
# ============================================================

@pytest.mark.skipif(not HAVE_DATA, reason="chưa chạy python -m benchmark.prepare_data")
def test_sample_is_stratified_and_calib_does_not_leak():
    pairs = read_jsonl(DATA_DIR / "pairs.jsonl")
    test = [p for p in pairs if p["split"] == "test"]
    calib = [p for p in pairs if p["split"] == "calib"]
    assert len(test) == 150 and len(calib) == 60
    for split, per in ((test, 50), (calib, 20)):
        assert sorted({p["label_id"]: 0 for p in split}) == [0, 1, 2]
        assert all(sum(p["label_id"] == k for p in split) == per for k in range(3))
    test_cv, test_jd = {p["resume_hash"] for p in test}, {p["jd_hash"] for p in test}
    assert not any(p["resume_hash"] in test_cv or p["jd_hash"] in test_jd for p in calib)
    texts = {t["hash"] for t in read_jsonl(DATA_DIR / "texts_en.jsonl")}
    assert all(p["resume_hash"] in texts and p["jd_hash"] in texts for p in pairs)


# ============================================================
# Dịch
# ============================================================

def test_translation_issues():
    assert kr.translation_issues("abc 2019 50%", "")[0] == ["empty"]
    assert kr.translation_issues("x" * 100, "y" * 10)[0]                      # quá ngắn → hỏng
    hard, warn = kr.translation_issues("Led 3 people, cut 40% cost in 2021", "Dẫn dắt nhóm, giảm chi phí")
    assert not hard and any(w.startswith("numbers_kept") for w in warn)


def test_translate_resumes_and_retries(tmp_path, fake_kbench):
    texts = [{"hash": f"h{i}", "type": "CV", "text": f"Python developer {i} since 2019"} for i in range(3)]
    out = tmp_path / "work" / "translations_vi.jsonl"
    fake_kbench.fail_after = 2
    s1 = kr.translate_all(texts, out, prior_roots=[tmp_path / "input"], max_attempts=1)
    assert s1["ok"] == 2 and s1["failed"] == 1
    # Lần sau: output lần trước nằm trong input → chỉ dịch lại văn bản lỗi
    prev = tmp_path / "input" / "run1"
    prev.mkdir(parents=True)
    shutil.move(str(out), prev / "translations_vi.jsonl")
    fake_kbench.fail_after = None
    s2 = kr.translate_all(texts, out, prior_roots=[tmp_path / "input"])
    assert s2["already_done"] == 2 and s2["todo"] == 1 and s2["ok"] == 1
    assert set(kr.load_translations([tmp_path])) == {"h0", "h1", "h2"}


# ============================================================
# Chấm
# ============================================================

PAIRS = [{"id": f"test-{i:03d}", "split": "test", "label_id": i % 3,
          "resume_hash": f"cv{i % 2}", "jd_hash": f"jd{i}"} for i in range(4)]
TEXTS = {**{f"cv{i}": f"Resume {i}: Python developer 2019 - present" for i in range(2)},
         **{f"jd{i}": f"Job {i}: need Python, 3 years" for i in range(4)}}


def test_score_all_uses_ai_service_code_and_resumes(tmp_path, fake_kbench):
    cfg = kr.RunConfig(model_key="gemini", lang="en", out_dir=tmp_path, prior_roots=[])
    stats = kr.run_scoring(cfg, PAIRS, TEXTS)
    assert stats["ok"] == 4 and stats["failed"] == 0
    models = {m for m, _ in fake_kbench.calls}
    assert models == {"google/gemini-3.5-flash-lite"}
    # 2 CV duy nhất → 2 lời gọi trích xuất + 4 lời gọi chấm
    assert len(fake_kbench.calls) == 6
    rows = read_jsonl(tmp_path / "scores.gemini.en.jsonl")
    assert all(0 <= r["total_score"] <= 100 and r["tier"] in {"GOOD_FIT", "POTENTIAL_FIT", "NOT_FIT"} for r in rows)
    assert rows[0]["result"]["years_calculated"] == pytest.approx(7.8, abs=0.1)   # 2019 → BENCH_TODAY
    assert "Ngày hiện tại: 2026-10-15" in fake_kbench.calls[-1][1]
    # Chạy lại: không gọi thêm lần nào
    again = kr.run_scoring(cfg, PAIRS, TEXTS)
    assert again["todo"] == 0 and len(fake_kbench.calls) == 6


def test_score_failures_recorded_then_retried(tmp_path, fake_kbench, monkeypatch):
    from app.core.llm_client import LLMManager
    monkeypatch.setattr(LLMManager, "BACKOFF_SECONDS", [0, 0])
    fake_kbench.fail_models = {"openai/gpt-5.4-nano-2026-03-17"}
    cfg = kr.RunConfig(model_key="gpt", lang="vi", out_dir=tmp_path, prior_roots=[])
    stats = kr.run_scoring(cfg, PAIRS[:2], TEXTS)
    assert stats["ok"] == 0 and stats["failed"] == 2 and stats["extract_failed"] >= 1
    fake_kbench.fail_models = set()
    stats = kr.run_scoring(cfg, PAIRS[:2], TEXTS)
    assert stats["ok"] == 2


def test_missing_translation_skipped(tmp_path, fake_kbench):
    cfg = kr.RunConfig(model_key="gemini", lang="vi", out_dir=tmp_path, prior_roots=[])
    stats = kr.run_scoring(cfg, PAIRS, {k: v for k, v in TEXTS.items() if k != "jd3"})
    assert stats["missing_text"] == 1 and stats["ok"] == 3


# ============================================================
# Notebook chạy được với gói dataset đã build
# ============================================================

@pytest.mark.skipif(not (BUILD_DIR / "ats-cv-scoring-benchmark.zip").exists(), reason="chưa build gói Kaggle")
def test_notebooks_run_end_to_end_with_built_dataset(tmp_path, fake_kbench, monkeypatch):
    """Giải nén đúng file zip sẽ tải lên Kaggle vào /kaggle/input giả, chạy mọi ô code của 2 notebook."""
    kaggle_input, kaggle_work = tmp_path / "input", tmp_path / "working"
    ds = kaggle_input / "ats-cv-scoring-benchmark"
    ds.mkdir(parents=True)
    kaggle_work.mkdir()
    with zipfile.ZipFile(BUILD_DIR / "ats-cv-scoring-benchmark.zip") as z:
        z.extractall(ds)
    # Chỉ dùng code trong gói (không lẫn code của repo đang chạy test)
    for mod in [m for m in sys.modules if m == "app" or m.startswith(("app.", "benchmark"))]:
        monkeypatch.delitem(sys.modules, mod)
    monkeypatch.setattr(sys, "path", [p for p in sys.path if Path(p or ".").resolve() != ROOT])

    def run(name: str, overrides: dict[str, str]):
        book = json.loads((ROOT / "benchmark" / "kaggle" / name).read_text(encoding="utf-8"))
        g: dict = {}
        for cell in book["cells"]:
            if cell["cell_type"] != "code":
                continue
            src = cell["source"].replace('Path("/kaggle/input")', f'Path(r"{kaggle_input}")') \
                                .replace('Path("/kaggle/working")', f'Path(r"{kaggle_work}")')
            for old, new in overrides.items():
                src = src.replace(old, new)
            exec(compile(src, name, "exec"), g)
        return g

    run("01_translate.ipynb", {"SMOKE_LIMIT = None": "SMOKE_LIMIT = 6"})
    assert len(read_jsonl(kaggle_work / "translations_vi.jsonl")) == 6
    g = run("02_score.ipynb", {"SMOKE_LIMIT = None": "SMOKE_LIMIT = 2"})
    assert g["CODE"].is_relative_to(kaggle_input)
    assert sys.modules["app.services.scoring.engine"].__file__.startswith(str(kaggle_input))
    names = sorted(p.name for p in kaggle_work.glob("scores.*.jsonl"))
    assert names == ["scores.gemini.en.jsonl", "scores.gemini.vi.jsonl", "scores.gemini.vi.r2.jsonl",
                     "scores.gemini.vi.r3.jsonl", "scores.gpt.en.jsonl", "scores.gpt.vi.jsonl"]


# ============================================================
# Bộ đánh giá
# ============================================================

def test_metrics_match_sklearn():
    import numpy as np
    from sklearn.metrics import accuracy_score, cohen_kappa_score, f1_score

    from benchmark import evaluate as ev

    rng = np.random.default_rng(0)
    y = list(rng.integers(0, 3, 200))
    p = list(rng.integers(0, 3, 200))
    assert ev.accuracy(y, p) == pytest.approx(accuracy_score(y, p))
    assert ev.macro_f1(y, p) == pytest.approx(f1_score(y, p, average="macro"))
    assert ev.quadratic_kappa(y, p) == pytest.approx(cohen_kappa_score(y, p, weights="quadratic"))


def test_tune_thresholds_finds_separating_cuts():
    from benchmark import evaluate as ev

    scores = [10, 20, 30, 55, 60, 65, 80, 90, 95]
    labels = [0, 0, 0, 1, 1, 1, 2, 2, 2]
    lo, hi = ev.tune_thresholds(scores, labels)
    assert 30 < lo <= 55 and 65 < hi <= 80
    assert ev.macro_f1(labels, [ev.to_label(s, lo, hi) for s in scores]) == 1.0


def test_mcnemar():
    from benchmark import evaluate as ev

    r = ev.mcnemar([True] * 20 + [False] * 5, [False] * 20 + [True] * 5)
    assert r["a_only_correct"] == 20 and r["b_only_correct"] == 5 and r["p_value"] < 0.01
    assert ev.mcnemar([True, False], [True, False])["p_value"] == 1.0


@pytest.mark.skipif(not HAVE_DATA, reason="chưa chạy python -m benchmark.prepare_data")
def test_full_local_chain_with_simulated_kaggle_output(tmp_path, fake_kbench, monkeypatch):
    """runner (kbench giả) → evaluate → report trên 210 cặp thật: chuỗi local chạy được khi có output thật."""
    from benchmark import evaluate as ev
    from benchmark import report as rp

    pairs = read_jsonl(DATA_DIR / "pairs.jsonl")
    texts = {t["hash"]: t["text"] for t in read_jsonl(DATA_DIR / "texts_en.jsonl")}
    kaggle_out = tmp_path / "results" / "kaggle" / "run1"
    for model_key, lang, tag, subset in (("gemini", "en", "", pairs), ("gemini", "vi", "", pairs),
                                         ("gemini", "vi", "r2", [p for p in pairs if p["split"] == "test"][:50])):
        cfg = kr.RunConfig(model_key=model_key, lang=lang, out_dir=kaggle_out, prior_roots=[], tag=tag)
        assert kr.run_scoring(cfg, subset, texts)["failed"] == 0

    for mod in (ev, rp):
        monkeypatch.setattr(mod, "RESULTS_DIR", tmp_path / "results")
    monkeypatch.setattr(ev, "KAGGLE_DIR", tmp_path / "results" / "kaggle")
    monkeypatch.setattr(ev, "BASELINE_DIR", Path(ev.BASELINE_DIR))   # baseline thật (tiếng Anh)
    summary = ev.main()
    gem = summary["results"]["gemini/vi"]
    assert gem["coverage"]["test"] == {"ok": 150, "attempted": 150, "total": 150}
    assert gem["test"]["n"] == 150 and "test_product_thresholds" in gem
    assert summary["product_thresholds_recommended"] == gem["thresholds"]
    assert summary["stability"]["gemini/vi/r2"]["n"] == 50
    assert summary["extraction"]["gemini/en"]["failed"] == 0
    assert any(c["a"] == "gemini/en" and c["b"] == "tfidf/en" for c in summary["comparisons"])
    rp.main()
    assert "Ma trận nhầm lẫn" in (tmp_path / "results" / "report.html").read_text(encoding="utf-8")
