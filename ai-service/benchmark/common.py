"""Tiện ích dùng chung cho benchmark (chạy local và trên Kaggle)."""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Iterable, Iterator

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw" / "hf"
BUILD_DIR = ROOT / "build"
RESULTS_DIR = ROOT / "results"

def utf8_console() -> None:
    """Console Windows mặc định cp1252 — in tiếng Việt sẽ lỗi. Gọi ở main() của các script chạy local
    (không gọi lúc import: đổi stdout giữa chừng làm hỏng bộ bắt output của pytest)."""
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError, OSError):  # stdout của Jupyter / Kaggle không cần và có thể không hỗ trợ
        pass


# [GIẢI THÍCH] 3 nhãn của bộ dữ liệu, đánh số 0 / 1 / 2, khớp 3 xếp loại của hệ thống:
# No Fit = Chưa phù hợp (NOT_FIT), Potential Fit = Tiềm năng (POTENTIAL_FIT), Good Fit = Phù hợp tốt (GOOD_FIT).
LABELS = ["No Fit", "Potential Fit", "Good Fit"]          # nhãn gốc của bộ dữ liệu, theo thứ tự 0 / 1 / 2
LABEL_ID = {name: i for i, name in enumerate(LABELS)}
LABELS_VI = ["Chưa phù hợp", "Tiềm năng", "Phù hợp tốt"]   # khớp 3 mức xếp loại của sản phẩm
TIER_TO_ID = {"NOT_FIT": 0, "POTENTIAL_FIT": 1, "GOOD_FIT": 2}


# [GIẢI THÍCH] Mã băm ngắn (16 ký tự SHA-1) của nội dung văn bản: hai văn bản giống hệt nhau có cùng mã.
# Dùng để nhận ra CV / JD trùng và làm khoá tham chiếu giữa pairs.jsonl và texts_en.jsonl.
def text_hash(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def file_sha1(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                # Dòng ghi dở (tiến trình bị ngắt giữa chừng) — bỏ qua, phần đó sẽ được chạy lại.
                continue
    return rows


def write_jsonl(path: Path, rows: Iterable[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            n += 1
    return n


def append_jsonl(path: Path, row: dict) -> None:
    """Ghi thêm một dòng và đẩy xuống đĩa ngay — ngắt giữa chừng thì tối đa mất dòng đang ghi."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
        f.flush()
        os.fsync(f.fileno())


def find_files(roots: Iterable[Path], name: str) -> Iterator[Path]:
    """Tìm mọi file tên `name` dưới các thư mục gốc (vd /kaggle/input + /kaggle/working)."""
    for root in roots:
        if root.exists():
            yield from sorted(root.rglob(name))
