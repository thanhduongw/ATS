"""CLI SSRC. Chạy ở ai-service: python -m research.run <lệnh>."""
from __future__ import annotations
import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

from research.preflight import BASE, read_pairs, validate_manifest
from research.pipeline import (
    APPROVALS, PRIVATE, REVIEW, StudyError, approved_text, expected_calls,
    export_scores, jd_text, read_policies, run_study,
)
from research.privacy import redact, remaining_contact_indicators, sha


def selected_pairs(pair_id: str | None, limit: int) -> list[dict]:
    rows = read_pairs(BASE / "data" / "pairs.csv")
    errors = validate_manifest(rows)
    if errors:
        raise StudyError("pairs.csv không hợp lệ: " + "; ".join(errors[:3]))
    if pair_id:
        rows = [p for p in rows if p["pair_id"] == pair_id]
        if not rows:
            raise StudyError(f"Không thấy pair_id {pair_id}")
    if limit > 0:
        rows = rows[:limit]
    return rows


def prepare(pairs: list[dict], *, overwrite: bool = False) -> None:
    from app.services.pdf_extractor import extract_text_from_pdf
    root = BASE / "data" / "cvs"
    for row in pairs:
        file = root / row["cv_relative_path"]
        dest = REVIEW / (row["cv_id"] + ".txt")
        if not file.is_file():
            raise StudyError(f"Thiếu PDF {row['cv_id']} ở {file}")
        if dest.exists() and not overwrite:
            print(f"[GIỮ] {dest.name}: có thể đã được sửa thủ công; dùng --overwrite nếu muốn tạo lại")
            continue
        result = extract_text_from_pdf(file.read_bytes())
        if len(result.text.strip()) < 200:
            raise StudyError(f"{row['cv_id']} có ít văn bản; cần kiểm tra OCR trước")
        content = redact(result.text)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        left = remaining_contact_indicators(content)
        print(f"[REVIEW] {row['cv_id']}: {len(content)} ký tự; dấu hiệu PII còn: {left or 'không thấy bằng regex'}")
    print(f"ĐỌC VÀ SỬA TRỰC TIẾP từng file trong {REVIEW}; chuẩn regex KHÔNG bảo đảm ẩn danh hoàn toàn.")
    print("SAU khi duyệt mới chạy approve --confirm-reviewed, rồi mới gọi Gemini.")


def approve(pairs: list[dict], *, confirm: bool) -> None:
    if not confirm:
        raise StudyError("Phải xác nhận --confirm-reviewed SAU KHI đã kiểm tra thủ công tất cả file chọn")
    approved = json.loads(APPROVALS.read_text(encoding="utf-8")) if APPROVALS.exists() else {}
    for row in pairs:
        cv_id = row["cv_id"]
        path = REVIEW / (cv_id + ".txt")
        if not path.is_file():
            raise StudyError(f"Thiếu file review: {cv_id}")
        content = path.read_text(encoding="utf-8")
        if len(content.strip()) < 200 or remaining_contact_indicators(content):
            raise StudyError(f"{cv_id}: thiếu nội dung hoặc còn dấu hiệu thông tin liên hệ")
        approved[cv_id] = sha(content)
    APPROVALS.parent.mkdir(parents=True, exist_ok=True)
    APPROVALS.write_text(json.dumps(approved, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[APPROVED] {len(pairs)} file; hash đã lưu. Nếu sửa file, phải approve lại.")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="SSRC 100 CV x 2 prompts (không can thiệp scoring production)")
    subs = parser.add_subparsers(dest="command", required=True)
    for cmd in ["prepare", "approve", "run", "export", "status"]:
        sub = subs.add_parser(cmd)
        sub.add_argument("--limit", type=int, default=0, help="N cặp đầu, 0=100 cặp")
        sub.add_argument("--pair", default="", help="PAIR-001, hoặc để trống")
        if cmd == "prepare":
            sub.add_argument("--overwrite", action="store_true")
        if cmd == "approve":
            sub.add_argument("--confirm-reviewed", action="store_true")
        if cmd == "run":
            sub.add_argument("--model", default="gemini-3.5-flash-lite")
            sub.add_argument("--stage", choices=["all", "extract", "score"], default="all")
            sub.add_argument("--dry-run", action="store_true")
        if cmd == "export":
            sub.add_argument("--out", type=Path, default=BASE / "output" / "results_100_pairs_2_prompts.csv")
    args = parser.parse_args(argv)
    try:
        pairs = selected_pairs(args.pair or None, args.limit)
        if args.command == "prepare":
            prepare(pairs, overwrite=args.overwrite)
        elif args.command == "approve":
            approve(pairs, confirm=args.confirm_reviewed)
        elif args.command == "status":
            counts = expected_calls(pairs)
            passed = sum(1 for id in {p["cv_id"] for p in pairs} if (REVIEW / (id + ".txt")).is_file())
            ok = sum(1 for id in {p["cv_id"] for p in pairs} if _approved_ok(id))
            scores = sum(1 for p in pairs for config in ("A", "B") if (BASE / "output" / "scores" / (p["pair_id"] + "__" + config + ".json")).exists())
            print(f"Tập chọn: {len(pairs)} cặp; review: {passed}; approved: {ok}; score files: {scores}/{counts['scores']}")
            print(f"Lượt Gemini dự kiến nếu cache trống: {sum(counts.values())} ({counts})")
        elif args.command == "run":
            counts = expected_calls(pairs)
            if args.dry_run:
                print(f"[DRY-RUN] {len(pairs)} cặp; tối đa {sum(counts.values())} lời gọi API ban đầu, chưa tính retry: {counts}")
                policies = read_policies(only_jds={p["jd_id"] for p in pairs})
                for p in pairs:
                    approved_text(p["cv_id"])
                    jd_text(p["jd_id"])
                    if p["jd_id"] not in policies:
                        raise StudyError("Thiếu policy: " + p["jd_id"])
                print("[DRY-RUN OK] CV đã duyệt và JD/policy đủ cho tập chọn; CHƯA GỌI API.")
            else:
                if not args.model.startswith("gemini-"):
                    raise StudyError("Nghiên cứu chỉ cho phép một model Gemini; dùng --model gemini-...")
                asyncio.run(run_study(pairs, stage=args.stage, model=args.model))
        elif args.command == "export":
            done, missing = export_scores(pairs, args.out)
            print(f"[EXPORT] {done}/{2*len(pairs)} kết quả, thiếu {missing}; file: {args.out}")
            if missing:
                print("[INCOMPLETE] Không sử dụng CSV này như kết quả hoàn chỉnh")
        return 0
    except (StudyError, ValueError, FileNotFoundError, ImportError) as exc:
        print(f"[ERROR] {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        # Không ghi payload/PII vào log khi Gemini lỗi.
        match = re.search(r"\b(400|401|403|404|408|429|500|502|503|504)\b", str(exc))
        status = f" HTTP {match.group(1)}" if match else ""
        print(f"[ERROR] {type(exc).__name__}{status}: lỗi khi gọi hoặc xác minh Gemini; các cache thành công được giữ lại. Mở docs để kiểm tra key, hạn mức, prompt và JD (không in nội dung CV).", file=sys.stderr)
        return 1


def _approved_ok(cv_id: str) -> bool:
    try:
        approved_text(cv_id)
        return True
    except StudyError:
        return False

if __name__ == "__main__":
    sys.exit(main())
