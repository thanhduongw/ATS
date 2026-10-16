"""Sinh notebook Kaggle: 01_translate.ipynb, 02_score.ipynb.   Chạy: python -m benchmark.kaggle.build_notebooks"""

from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

SETUP = '''
# Tìm dataset đã đính kèm (code ai-service + dữ liệu) trong /kaggle/input
import importlib, json, subprocess, sys
from pathlib import Path

INPUT, WORK = Path("/kaggle/input"), Path("/kaggle/working")
engine_file = next(INPUT.rglob("ats_code/app/services/scoring/engine.py"), None)
assert engine_file, "Chưa đính kèm dataset ats-cv-scoring-benchmark (Add Input → Datasets)"
CODE = engine_file.parents[3]                     # .../ats_code
DATA = CODE.parent / "data"
sys.path.insert(0, str(CODE))

if importlib.util.find_spec("pydantic_settings") is None:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "pydantic-settings"], check=True)

import kaggle_benchmarks as kbench
from benchmark.common import read_jsonl
from benchmark import kaggle_runner as kr

pairs = read_jsonl(DATA / "pairs.jsonl")
texts_en = {t["hash"]: t for t in read_jsonl(DATA / "texts_en.jsonl")}
print("kaggle_benchmarks", getattr(kbench, "__version__", "?"), "| code:", CODE)
print(len(pairs), "cặp |", len(texts_en), "văn bản duy nhất")
'''


def nb(cells: list[tuple[str, str]]) -> dict:
    return {
        "cells": [
            {"cell_type": t, "metadata": {}, "source": s.strip("\n"),
             **({"execution_count": None, "outputs": []} if t == "code" else {})}
            for t, s in cells
        ],
        "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                     "language_info": {"name": "python"}},
        "nbformat": 4, "nbformat_minor": 5,
    }


TRANSLATE = nb([
    ("markdown", """
# 01 · Dịch dữ liệu benchmark EN → VI

Dịch mỗi văn bản duy nhất (CV, JD) một lần bằng `google/gemini-2.5-flash` (khác model chấm).
Kết quả: `/kaggle/working/translations_vi.jsonl` — mỗi dòng một văn bản, có kiểm tra tỉ lệ độ dài, con số.

**Chạy tiếp được:** nếu hết quota giữa chừng, chạy lại notebook (đính kèm output của lần trước làm input);
văn bản đã dịch ok sẽ được bỏ qua.
"""),
    ("code", SETUP),
    ("markdown", "## Cấu hình\n`SMOKE_LIMIT = 2` để chạy thử 2 văn bản; `None` để dịch toàn bộ."),
    ("code", "SMOKE_LIMIT = None"),
    ("code", '''
stats = kr.translate_all(
    list(texts_en.values()),
    WORK / "translations_vi.jsonl",
    prior_roots=[INPUT, WORK],
    limit=SMOKE_LIMIT,
)
print(stats)
'''),
    ("markdown", "## Tổng kết"),
    ("code", '''
done = kr.load_translations([INPUT, WORK])
rows = read_jsonl(WORK / "translations_vi.jsonl")
warn = [r for r in rows if r.get("ok") and r.get("issues")]
print(f"Đã có bản dịch: {len(done)}/{len(texts_en)} | lỗi ở lượt này: {sum(not r['ok'] for r in rows)} | "
      f"có cảnh báo: {len(warn)}")
'''),
])

SCORE = nb([
    ("markdown", """
# 02 · Trích xuất + chấm điểm (đúng code ai-service)

Mỗi lượt = một model × một ngôn ngữ: trích xuất CV (LLM #1) → Python tính số năm, lọc hồ sơ → chấm (LLM #2) → Python tính điểm.
Model: `google/gemini-3.5-flash-lite` (sản phẩm) và `openai/gpt-5.4-nano-2026-03-17` (so sánh).

**Input cần đính kèm:** dataset `ats-cv-scoring-benchmark` + output của notebook `01_translate` (bản dịch tiếng Việt).

**Chạy tiếp được:** hết quota giữa chừng thì chạy lại (đính kèm thêm output của lần chạy trước); cặp đã chấm ok được bỏ qua.
"""),
    ("code", SETUP),
    ("markdown", """
## Cấu hình
- `SMOKE_LIMIT = 2`: chạy thử 2 cặp mỗi lượt để kiểm tra trước; `None` để chạy toàn bộ.
- `RUNS`: các lượt cần chạy — có thể tách Gemini / GPT ra hai lần chạy chạy song song.
- `STABILITY`: chấm lặp thêm 2 lần 50 cặp test (Gemini, tiếng Việt) để đo độ ổn định.
"""),
    ("code", '''
SMOKE_LIMIT = None
RUNS = [("gemini", "en"), ("gemini", "vi"), ("gpt", "en"), ("gpt", "vi")]
STABILITY = True
'''),
    ("code", '''
vi = kr.load_translations([INPUT, WORK])
texts = {"en": {h: t["text"] for h, t in texts_en.items()}, "vi": vi}
print("Bản dịch tiếng Việt:", len(vi), "/", len(texts_en))

all_stats = {}
for model_key, lang in RUNS:
    cfg = kr.RunConfig(model_key=model_key, lang=lang, out_dir=WORK, prior_roots=[INPUT])
    all_stats[cfg.score_file] = kr.run_scoring(cfg, pairs, texts[lang], limit=SMOKE_LIMIT)
    print(cfg.score_file, all_stats[cfg.score_file])
'''),
    ("code", '''
if STABILITY:
    subset = [p for p in pairs if p["split"] == "test"][:50]
    for tag in ("r2", "r3"):
        cfg = kr.RunConfig(model_key="gemini", lang="vi", out_dir=WORK, prior_roots=[INPUT], tag=tag)
        all_stats[cfg.score_file] = kr.run_scoring(cfg, subset, texts["vi"], limit=SMOKE_LIMIT)
        print(cfg.score_file, all_stats[cfg.score_file])
'''),
    ("markdown", "## Tổng kết (tính cả kết quả của các lần chạy trước)"),
    ("code", '''
from benchmark.common import find_files
for name in sorted({p.name for p in find_files([INPUT, WORK], "scores.*.jsonl")}):
    rows = [r for p in find_files([INPUT, WORK], name) for r in read_jsonl(p)]
    ok = {r["pair_id"] for r in rows if r.get("ok")}
    print(f"{name:32} ok={len(ok)}  lỗi (chưa có kết quả ok)={len({r['pair_id'] for r in rows} - ok)}")
'''),
])


def main() -> None:
    for name, book in (("01_translate.ipynb", TRANSLATE), ("02_score.ipynb", SCORE)):
        (HERE / name).write_text(json.dumps(book, ensure_ascii=False, indent=1), encoding="utf-8")
        print("wrote", HERE / name)


if __name__ == "__main__":
    main()
