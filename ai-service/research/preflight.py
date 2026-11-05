"""Phần 1 SSRC-II'2026: kiểm tra input 100 cặp mà KHÔNG gọi Gemini/API.

Chạy từ thư mục ai-service:
  python -m research.preflight --cv-root research/data/cvs

Chỉ lưu ID, số trang và số ký tự; không lưu văn bản CV, không đọc API key.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE = Path(__file__).resolve().parent
CV_ID_RE = re.compile(r"^CV-(BE|FE|FS)-\d{3}$")
JD_ID_RE = re.compile(r"^JD-(BE|FE|FS)-\d{2}$")
PLACEHOLDER_RE = re.compile(r"DAN_NGUYEN_VAN_JD_.*_VAO_DAY")
REQUIRED_COLUMNS = {
    "pair_id", "cv_id", "jd_id", "role_cv", "role_jd", "language", "phase",
    "cv_relative_path", "jd_relative_path"
}


def read_pairs(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        if not REQUIRED_COLUMNS.issubset(fields):
            raise ValueError(f"pairs.csv thiếu cột: {sorted(REQUIRED_COLUMNS - fields)}")
        return list(reader)


def validate_manifest(pairs: list[dict[str, str]]) -> list[str]:
    errors: list[str] = []
    if len(pairs) != 100:
        errors.append(f"Manifest cần có 100 cặp, nhưng có {len(pairs)}")
    for field in ("pair_id", "cv_id"):
        for value, n in Counter(r[field] for r in pairs).items():
            if n != 1:
                errors.append(f"{field}={value} xuất hiện {n} lần")
    for idx, pair in enumerate(pairs, start=2):
        cv_id, jd_id = pair["cv_id"], pair["jd_id"]
        if not CV_ID_RE.fullmatch(cv_id):
            errors.append(f"Dòng {idx}: CV ID không hợp lệ: {cv_id}")
        if not JD_ID_RE.fullmatch(jd_id):
            errors.append(f"Dòng {idx}: JD ID không hợp lệ: {jd_id}")
        if pair["language"] != "VI":
            errors.append(f"Dòng {idx}: Ngôn ngữ khác VI: {pair['language']}")
        # Bảo vệ khỏi đường dẫn đi ra ngoài thư mục data.
        cv_rel = Path(pair["cv_relative_path"])
        jd_rel = Path(pair["jd_relative_path"])
        if cv_rel.is_absolute() or ".." in cv_rel.parts or cv_rel.suffix.lower() != ".pdf":
            errors.append(f"Dòng {idx}: đường dẫn PDF không an toàn: {cv_rel}")
        if jd_rel.is_absolute() or ".." in jd_rel.parts or jd_rel.suffix.lower() != ".txt":
            errors.append(f"Dòng {idx}: đường dẫn JD không an toàn: {jd_rel}")
        if cv_rel.stem != cv_id:
            errors.append(f"Dòng {idx}: tên PDF khác CV ID: {cv_rel}")
        if jd_rel.stem != jd_id:
            errors.append(f"Dòng {idx}: tên JD khác JD ID: {jd_rel}")
    return errors


def check_pdf(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"status": "MISSING", "pages": 0, "text_chars": 0}
    try:
        import fitz
        # fitz.open dùng file-backed PDF; tránh đưa toàn bộ PDF lớn vào RAM.
        with fitz.open(str(path)) as doc:
            text_chars = 0
            for page in doc:
                text_chars += len(page.get_text("text").strip())
            pages = len(doc)
        return {
            "status": "OK" if text_chars >= 200 else "REVIEW_TEXT",
            "pages": pages,
            "text_chars": text_chars,
            "size_bytes": path.stat().st_size,
        }
    except Exception as exc:
        return {"status": "INVALID_PDF", "error_type": type(exc).__name__, "pages": 0, "text_chars": 0}


def check_jds(pairs: list[dict[str, str]]) -> dict[str, dict[str, Any]]:
    jd_files = sorted({p["jd_relative_path"] for p in pairs})
    statuses: dict[str, dict[str, Any]] = {}
    for item in jd_files:
        path = BASE / "data" / item
        if not path.exists():
            status = "MISSING"
            size = 0
        else:
            content = path.read_text(encoding="utf-8-sig").strip()
            size = len(content)
            status = "PLACEHOLDER" if PLACEHOLDER_RE.search(content) else "OK" if size >= 150 else "REVIEW_TEXT"
        statuses[path.stem] = {"status": status, "text_chars": size}
    return statuses


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Kiểm tra 100 cặp CV–JD trước thực nghiệm, không gọi AI")
    parser.add_argument("--cv-root", type=Path, default=BASE / "data" / "cvs", help="Thư mục chứa Backend/Frontend/Fullstack")
    parser.add_argument("--limit", type=int, default=0, help="Chỉ kiểm tra N PDF đầu tiên, 0 = tất cả")
    parser.add_argument("--require-jds", action="store_true", help="Báo lỗi nếu chưa có nguyên văn 6 JD")
    parser.add_argument("--output", type=Path, default=BASE / "output" / "preflight_report.json")
    args = parser.parse_args(argv)

    pairs_path = BASE / "data" / "pairs.csv"
    if not pairs_path.is_file():
        print("[ERROR] Không tìm thấy research/data/pairs.csv")
        return 2
    try:
        pairs = read_pairs(pairs_path)
    except (OSError, ValueError) as exc:
        print(f"[ERROR] Không thể đọc manifest: {exc}")
        return 2
    errors = validate_manifest(pairs)
    root = args.cv_root.expanduser().resolve()
    if not root.is_dir():
        errors.append(f"Không thấy thư mục CV: {root}")

    checked_pairs = pairs[:args.limit] if args.limit > 0 else pairs
    results = []
    seen = {}
    if root.is_dir():
        for pair in checked_pairs:
            # Không in CV content hoặc tên ứng viên.
            cv_id = pair["cv_id"]
            if cv_id not in seen:
                seen[cv_id] = check_pdf(root / pair["cv_relative_path"])
            results.append({"pair_id": pair["pair_id"], "cv_id": cv_id,
                            "jd_id": pair["jd_id"], **seen[cv_id]})
        for row in results:
            if row["status"] in ("MISSING", "INVALID_PDF"):
                errors.append(f"{row['cv_id']}: {row['status']}")

    jd_statuses = check_jds(pairs)
    bad_jds = [k for k,v in jd_statuses.items() if v["status"] != "OK"]
    if args.require_jds and bad_jds:
        errors.append("JD chưa đủ nguyên văn: " + ", ".join(bad_jds))

    report = {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "api_called": False,
        "pair_count_manifest": len(pairs),
        "pairs_checked": len(results),
        "pdf_counts": dict(Counter(r["status"] for r in results)),
        "jd_statuses": jd_statuses,
        "manifest_errors": errors,
        "pdf_results": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest: {len(pairs)}/100 cặp; PDF đã kiểm tra: {len(results)}")
    print("PDF:", report["pdf_counts"])
    print("JD:", {k: v["status"] for k,v in jd_statuses.items()})
    print("API Gemini: KHÔNG GỌI")
    print("Report:", args.output)
    if errors:
        print("LỖI:", *errors[:20], sep="\n - ")
        return 2
    if bad_jds:
        print("[CHƯA SẴN SÀNG CHẤM] Cần thay 6 file JD mẫu bằng nguyên văn JD thật.")
    if any(x["status"] == "REVIEW_TEXT" for x in results):
        print("[LƯU Ý] Có PDF cần xem lại văn bản trích xuất.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
