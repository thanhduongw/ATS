"""
Chuẩn bị dữ liệu benchmark + đóng gói Kaggle Dataset.

1. Tải `cnamuangtoun/resume-job-description-fit` (Hugging Face) nếu chưa có ở data/raw/hf/.
2. Lấy mẫu phân tầng (seed cố định):
     test  : 150 cặp (50 / nhãn) từ split test — chỉ dùng để báo kết quả cuối;
     calib : 60 cặp (20 / nhãn) từ split train — chọn ngưỡng xếp loại.
   Bộ gốc có CV / JD xuất hiện ở cả train lẫn test, nên cặp calib nào dùng CV hoặc JD đã có trong
   test bị loại (tránh rò rỉ khi hiệu chỉnh ngưỡng).
3. Ghi data/pairs.jsonl (id, split, nhãn, hash CV/JD) và data/texts_en.jsonl (mỗi văn bản duy nhất một dòng).
4. Đóng gói build/kaggle_dataset/ (+ .zip): dữ liệu + đúng code chấm điểm của ai-service + runner.

Chạy:  python -m benchmark.prepare_data            (đã có pairs.jsonl thì không lấy mẫu lại, trừ khi --resample)
"""

from __future__ import annotations

import argparse
import json
import shutil
import urllib.request
import zipfile
from datetime import datetime, timezone

import pandas as pd

from benchmark.common import (
    BUILD_DIR, DATA_DIR, LABEL_ID, LABELS, RAW_DIR, ROOT, file_sha1, read_jsonl, text_hash, write_jsonl,
)

HF_URL = "https://huggingface.co/datasets/cnamuangtoun/resume-job-description-fit/resolve/main/{split}.csv"
SEED = 20261015
TEST_PER_LABEL = 50
CALIB_PER_LABEL = 20

APP_ROOT = ROOT.parent
# Đúng các module ai-service cần cho trích xuất + chấm điểm (không DB / RabbitMQ / S3 / OCR).
CODE_FILES = [
    "app/__init__.py",
    "app/core/__init__.py", "app/core/config.py", "app/core/llm_client.py",
    "app/schemas/__init__.py", "app/schemas/cv_extraction.py", "app/schemas/scoring.py",
    "app/services/__init__.py", "app/services/experience.py", "app/services/cv_extraction_engine.py",
    "app/services/prompts/__init__.py", "app/services/prompts/cv_extraction.py",
    "app/services/scoring/__init__.py", "app/services/scoring/engine.py",
    "app/services/scoring/profile.py", "app/services/scoring/prompt.py",
    "benchmark/__init__.py", "benchmark/common.py", "benchmark/kaggle_runner.py",
]


def download() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for split in ("train", "test"):
        path = RAW_DIR / f"{split}.csv"
        if not path.exists():
            print(f"Tải {split}.csv ...")
            urllib.request.urlretrieve(HF_URL.format(split=split), path)


def load(split: str) -> pd.DataFrame:
    df = pd.read_csv(RAW_DIR / f"{split}.csv")
    df = df.dropna(subset=["resume_text", "job_description_text", "label"])
    df = df[df["label"].isin(LABELS)].copy()
    df["resume_hash"] = df["resume_text"].map(text_hash)
    df["jd_hash"] = df["job_description_text"].map(text_hash)
    df["row"] = df.index
    return df


def stratified(df: pd.DataFrame, per_label: int, seed: int) -> pd.DataFrame:
    parts = []
    for label in LABELS:
        group = df[df["label"] == label]
        if len(group) < per_label:
            raise SystemExit(f"Không đủ cặp nhãn {label}: cần {per_label}, có {len(group)}")
        parts.append(group.sample(n=per_label, random_state=seed))
    return pd.concat(parts).sample(frac=1, random_state=seed)


def sample() -> tuple[pd.DataFrame, pd.DataFrame]:
    train, test = load("train"), load("test")
    test_s = stratified(test, TEST_PER_LABEL, SEED)
    leak = train["resume_hash"].isin(test_s["resume_hash"]) | train["jd_hash"].isin(test_s["jd_hash"])
    calib_s = stratified(train[~leak], CALIB_PER_LABEL, SEED)
    print(f"Calib: loại {int(leak.sum())}/{len(train)} cặp train trùng CV/JD với test")
    return test_s, calib_s


def write_data(test_s: pd.DataFrame, calib_s: pd.DataFrame) -> None:
    pairs, texts = [], {}
    for split, df in (("test", test_s), ("calib", calib_s)):
        for i, r in enumerate(df.itertuples(), start=1):
            pairs.append({
                "id": f"{split}-{i:03d}", "split": split, "source_row": int(r.row),
                "label": r.label, "label_id": LABEL_ID[r.label],
                "resume_hash": r.resume_hash, "jd_hash": r.jd_hash,
            })
            texts.setdefault(r.resume_hash, {"hash": r.resume_hash, "type": "CV", "text": r.resume_text})
            texts.setdefault(r.jd_hash, {"hash": r.jd_hash, "type": "JD", "text": r.job_description_text})
    write_jsonl(DATA_DIR / "pairs.jsonl", pairs)
    write_jsonl(DATA_DIR / "texts_en.jsonl", texts.values())
    meta = {
        "dataset": "cnamuangtoun/resume-job-description-fit",
        "source_sha1": {s: file_sha1(RAW_DIR / f"{s}.csv") for s in ("train", "test")},
        "seed": SEED, "test_per_label": TEST_PER_LABEL, "calib_per_label": CALIB_PER_LABEL,
        "pairs": len(pairs), "unique_cv": sum(t["type"] == "CV" for t in texts.values()),
        "unique_jd": sum(t["type"] == "JD" for t in texts.values()),
        "chars_total": sum(len(t["text"]) for t in texts.values()),
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    (DATA_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: meta[k] for k in ("pairs", "unique_cv", "unique_jd", "chars_total")}, ensure_ascii=False))


def build_kaggle_dataset() -> None:
    """build/kaggle_dataset/: data/ + ats_code/ (code ai-service) + dataset-metadata.json, và bản .zip."""
    out = BUILD_DIR / "kaggle_dataset"
    if out.exists():
        shutil.rmtree(out)
    (out / "data").mkdir(parents=True)
    for name in ("pairs.jsonl", "texts_en.jsonl", "meta.json"):
        shutil.copy2(DATA_DIR / name, out / "data" / name)
    for rel in CODE_FILES:
        dst = out / "ats_code" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(APP_ROOT / rel, dst)
    (out / "dataset-metadata.json").write_text(json.dumps({
        "title": "ATS CV scoring benchmark", "id": "USERNAME/ats-cv-scoring-benchmark",
        "licenses": [{"name": "other"}],
    }, indent=1), encoding="utf-8")

    zip_path = BUILD_DIR / "ats-cv-scoring-benchmark.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(out.rglob("*")):
            if path.is_file() and path.name != "dataset-metadata.json":
                z.write(path, path.relative_to(out))
    print(f"Kaggle Dataset: {out}  |  zip: {zip_path} ({zip_path.stat().st_size // 1024} KB)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resample", action="store_true", help="lấy mẫu lại dù đã có data/pairs.jsonl")
    args = parser.parse_args()
    download()
    if args.resample or not (DATA_DIR / "pairs.jsonl").exists():
        write_data(*sample())
    else:
        print(f"Giữ nguyên tập mẫu đã có ({len(read_jsonl(DATA_DIR / 'pairs.jsonl'))} cặp) — dùng --resample để lấy lại")
    build_kaggle_dataset()


if __name__ == "__main__":
    main()
