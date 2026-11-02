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
    BUILD_DIR, DATA_DIR, LABEL_ID, LABELS, RAW_DIR, ROOT, file_sha1, read_jsonl, text_hash, utf8_console, write_jsonl,
)

# [GIẢI THÍCH] NGUỒN DỮ LIỆU: bộ công khai "cnamuangtoun/resume-job-description-fit" trên Hugging Face.
# Mỗi dòng = 1 CV + 1 tin tuyển dụng (JD) + 1 nhãn: No Fit / Potential Fit / Good Fit.
# Bộ gốc chia sẵn 2 file: train.csv (6.241 cặp) và test.csv (1.759 cặp). {split} được thay bằng train / test.
HF_URL = "https://huggingface.co/datasets/cnamuangtoun/resume-job-description-fit/resolve/main/{split}.csv"
# [GIẢI THÍCH] Hạt giống ngẫu nhiên cố định: ai chạy lại cũng bốc ra ĐÚNG 210 cặp như nhau (tái lập được).
SEED = 20261015
# [GIẢI THÍCH] Lấy CHIA ĐỀU mỗi nhãn: test 50 cặp/nhãn (= 150), calib 20 cặp/nhãn (= 60).
# Chia đều vì bộ gốc lệch (No Fit ~49%): nếu lấy theo tỉ lệ gốc, đoán toàn "No Fit" đã đúng gần một nửa.
TEST_PER_LABEL = 50
CALIB_PER_LABEL = 20

# [GIẢI THÍCH] Danh sách file code ai-service được đóng gói lên Kaggle, để benchmark chạy ĐÚNG code của sản phẩm
# (trích xuất + chấm điểm), không viết lại. Không cần DB / RabbitMQ / S3 / OCR.
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


# [GIẢI THÍCH] Tải 2 file CSV gốc từ Hugging Face về data/raw/hf/ (bỏ qua nếu đã có).
def download() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for split in ("train", "test"):
        path = RAW_DIR / f"{split}.csv"
        if not path.exists():
            print(f"Tải {split}.csv ...")
            urllib.request.urlretrieve(HF_URL.format(split=split), path)


# [GIẢI THÍCH] Đọc một file CSV, bỏ dòng thiếu dữ liệu / nhãn lạ, rồi gán cho mỗi CV và JD một "mã băm"
# của nội dung (text_hash) để nhận ra văn bản trùng nhau giữa các cặp và giữa train / test.
# row = số dòng gốc trong file, lưu lại để truy ngược cặp nào lấy từ đâu.
def load(split: str) -> pd.DataFrame:
    df = pd.read_csv(RAW_DIR / f"{split}.csv")
    df = df.dropna(subset=["resume_text", "job_description_text", "label"])
    df = df[df["label"].isin(LABELS)].copy()
    df["resume_hash"] = df["resume_text"].map(text_hash)
    df["jd_hash"] = df["job_description_text"].map(text_hash)
    df["row"] = df.index
    return df


# [GIẢI THÍCH] LẤY MẪU PHÂN TẦNG: với MỖI nhãn, bốc ngẫu nhiên đúng per_label cặp (seed cố định),
# rồi trộn thứ tự. Nhãn nào không đủ cặp thì dừng báo lỗi.
def stratified(df: pd.DataFrame, per_label: int, seed: int) -> pd.DataFrame:
    parts = []
    for label in LABELS:
        group = df[df["label"] == label]
        if len(group) < per_label:
            raise SystemExit(f"Không đủ cặp nhãn {label}: cần {per_label}, có {len(group)}")
        parts.append(group.sample(n=per_label, random_state=seed))
    return pd.concat(parts).sample(frac=1, random_state=seed)


# [GIẢI THÍCH] TẠO 2 TẬP:
# - test  : 50 cặp/nhãn lấy từ test.csv -> chỉ dùng để BÁO KẾT QUẢ CUỐI.
# - calib : 20 cặp/nhãn lấy từ train.csv -> chỉ dùng để CHỌN NGƯỠNG xếp loại.
# Bộ gốc có CV / JD xuất hiện ở cả train lẫn test, nên cặp train nào dùng chung CV hoặc JD với tập test
# bị loại khỏi calib (leak). Nếu không, lúc chọn ngưỡng sẽ "nhìn trộm" dữ liệu test. Kết quả: loại 2.414 cặp.
def sample() -> tuple[pd.DataFrame, pd.DataFrame]:
    train, test = load("train"), load("test")
    test_s = stratified(test, TEST_PER_LABEL, SEED)
    # leak = True cho cặp train có CV HOẶC JD trùng với tập test đã chọn; ~leak = các cặp còn lại.
    leak = train["resume_hash"].isin(test_s["resume_hash"]) | train["jd_hash"].isin(test_s["jd_hash"])
    calib_s = stratified(train[~leak], CALIB_PER_LABEL, SEED)
    print(f"Calib: loại {int(leak.sum())}/{len(train)} cặp train trùng CV/JD với test")
    return test_s, calib_s


# [GIẢI THÍCH] Ghi kết quả lấy mẫu ra 3 file trong data/:
# - pairs.jsonl   : 210 cặp (id test-001..., split, nhãn, mã băm CV/JD, dòng gốc).
# - texts_en.jsonl: mỗi CV / JD DUY NHẤT một dòng (177 CV + 104 JD), vì nhiều cặp dùng chung một CV hoặc JD.
# - meta.json     : tên bộ dữ liệu, mã SHA-1 của file gốc (chứng minh đúng phiên bản), seed, số lượng.
def write_data(test_s: pd.DataFrame, calib_s: pd.DataFrame) -> None:
    pairs, texts = [], {}
    for split, df in (("test", test_s), ("calib", calib_s)):
        for i, r in enumerate(df.itertuples(), start=1):
            pairs.append({
                "id": f"{split}-{i:03d}", "split": split, "source_row": int(r.row),
                "label": r.label, "label_id": LABEL_ID[r.label],
                "resume_hash": r.resume_hash, "jd_hash": r.jd_hash,
            })
            # setdefault: văn bản đã có thì giữ nguyên, chưa có mới thêm -> mỗi văn bản chỉ lưu một lần.
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


# [GIẢI THÍCH] Đóng gói để tải lên Kaggle: build/kaggle_dataset/ gồm data/ (dữ liệu đã lấy mẫu)
# + ats_code/ (đúng code ai-service ở CODE_FILES), và nén thành build/ats-cv-scoring-benchmark.zip.
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


# [GIẢI THÍCH] Chạy: python -m benchmark.prepare_data
# 1. Tải dữ liệu gốc (nếu chưa có).
# 2. Đã có data/pairs.jsonl thì GIỮ NGUYÊN 210 cặp cũ (để kết quả không đổi); muốn bốc lại thì thêm --resample.
# 3. Đóng gói lại file zip cho Kaggle.
def main() -> None:
    utf8_console()
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
