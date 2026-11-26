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
    APPROVALS, PRIVATE, REVIEW, SCORE_DIR, StudyError, approved_text, expected_calls,
    FROZEN_EXTRACT_VERSIONS, export_scores, jd_text, load_frozen_extraction, read_policies, run_study,
)
from research.privacy import redact, remaining_contact_indicators, sha
from research.prompts import PROMPT_VERSIONS

ORIGINAL_OUTPUT = BASE / "output"
EXTRA_OUTPUT = BASE / "output_extra"


def parse_configs(value: str) -> tuple[str, ...]:
    configs = tuple(dict.fromkeys(c.strip().upper() for c in value.split(",") if c.strip()))
    if not configs or any(c not in PROMPT_VERSIONS for c in configs):
        raise StudyError(f"--configs chỉ gồm {','.join(PROMPT_VERSIONS)}, ví dụ A,B hoặc C")
    return configs


def run_dir_of(args) -> Path | None:
    """Thư mục của một đợt chạy thêm; None = hành vi gốc (output/scores)."""
    if not args.run_tag and args.output_dir is None:
        return None
    if args.run_tag and not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", args.run_tag):
        raise StudyError("--run-tag chỉ gồm chữ, số, '_' hoặc '-'")
    base = (args.output_dir or EXTRA_OUTPUT).resolve()
    run_dir = base / args.run_tag if args.run_tag else base
    original = ORIGINAL_OUTPUT.resolve()
    if run_dir == original or original in run_dir.parents:
        raise StudyError(f"Không ghi vào {original}: kết quả gốc của bài báo phải giữ nguyên")
    return run_dir


def _sum_tokens(score_dir: Path, pairs: list[dict], configs: tuple[str, ...]) -> dict:
    total = {"files": 0, "input_tokens": 0, "output_tokens": 0, "retries": 0, "validation_retries": 0}
    for p in pairs:
        for config in configs:
            path = score_dir / f"{p['pair_id']}__{config}.json"
            if path.is_file():
                meta = json.loads(path.read_text(encoding="utf-8"))["meta"]
                total["files"] += 1
                for key in ("input_tokens", "output_tokens", "retries", "validation_retries"):
                    total[key] += int(meta.get(key) or 0)
    return total


def write_manifest(run_dir: Path, entry: dict) -> None:
    path = run_dir / "run_manifest.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {"invocations": []}
    data["invocations"].append(entry)
    run_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


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
        if cmd in ("run", "export", "status"):
            sub.add_argument("--configs", default="A,B", help="Cấu hình chấm, ví dụ A,B hoặc C")
            sub.add_argument("--output-dir", type=Path, default=None,
                             help="Thư mục gốc của đợt chạy thêm (mặc định research/output_extra khi có --run-tag)")
            sub.add_argument("--run-tag", default="", help="Tên đợt chạy, ví dụ C_r1; ghi vào <output-dir>/<run-tag>/")
        if cmd in ("run", "status"):
            sub.add_argument("--extraction-dir", type=Path, default=None,
                             help="Đọc thẳng JSON trích xuất phiên bản hiện hành (cv/*.json, jd/*.json) ở đây; không gọi API trích xuất")
        if cmd == "run":
            sub.add_argument("--model", default="gemini-3.5-flash-lite")
            sub.add_argument("--stage", choices=["all", "extract", "score"], default="all")
            sub.add_argument("--dry-run", action="store_true")
        if cmd == "export":
            sub.add_argument("--out", type=Path, default=None,
                             help="Mặc định output/results_100_pairs_2_prompts.csv, hoặc <run-dir>/results_<run-tag>.csv")
    args = parser.parse_args(argv)
    try:
        pairs = selected_pairs(args.pair or None, args.limit)
        configs = parse_configs(getattr(args, "configs", "A,B"))
        run_dir = run_dir_of(args) if hasattr(args, "run_tag") else None
        score_dir = run_dir / "scores" if run_dir else SCORE_DIR
        extraction_dir = getattr(args, "extraction_dir", None)
        if run_dir is not None and args.command == "run" and extraction_dir is None:
            raise StudyError("Đợt chạy thêm phải có --extraction-dir (bản trích xuất cố định); "
                             "nếu không, bước trích xuất sẽ ghi đè research/output/extracted")
        if args.command == "prepare":
            prepare(pairs, overwrite=args.overwrite)
        elif args.command == "approve":
            approve(pairs, confirm=args.confirm_reviewed)
        elif args.command == "status":
            counts = expected_calls(pairs, configs, frozen_extraction=extraction_dir is not None)
            passed = sum(1 for id in {p["cv_id"] for p in pairs} if (REVIEW / (id + ".txt")).is_file())
            ok = sum(1 for id in {p["cv_id"] for p in pairs} if _approved_ok(id))
            scores = sum(1 for p in pairs for config in configs if (score_dir / (p["pair_id"] + "__" + config + ".json")).exists())
            print(f"Tập chọn: {len(pairs)} cặp; review: {passed}; approved: {ok}; score files: {scores}/{counts['scores']}")
            print(f"Lượt Gemini dự kiến nếu cache trống: {sum(counts.values())} ({counts})")
        elif args.command == "run":
            counts = expected_calls(pairs, configs, frozen_extraction=extraction_dir is not None)
            if run_dir is not None:
                print(f"[RUN-DIR] {run_dir} (scores: {score_dir}); cấu hình {','.join(configs)}; "
                      f"prompt {', '.join(PROMPT_VERSIONS[c] for c in configs)}")
            if args.dry_run:
                print(f"[DRY-RUN] {len(pairs)} cặp; tối đa {sum(counts.values())} lời gọi API ban đầu, chưa tính retry: {counts}")
                policies = read_policies(only_jds={p["jd_id"] for p in pairs})
                for p in pairs:
                    approved_text(p["cv_id"])
                    jd_text(p["jd_id"])
                    if p["jd_id"] not in policies:
                        raise StudyError("Thiếu policy: " + p["jd_id"])
                if extraction_dir is not None:
                    for id in sorted({p["cv_id"] for p in pairs}):
                        load_frozen_extraction(extraction_dir, "cv", id, approved_text(id), args.model)
                    for id in sorted({p["jd_id"] for p in pairs}):
                        load_frozen_extraction(extraction_dir, "jd", id, jd_text(id), args.model)
                    print(f"[DRY-RUN] Trích xuất cố định hợp lệ cho {len({p['cv_id'] for p in pairs})} CV + "
                          f"{len({p['jd_id'] for p in pairs})} JD ở {extraction_dir}")
                cached = sum(1 for p in pairs for c in configs if (score_dir / f"{p['pair_id']}__{c}.json").is_file())
                print(f"[DRY-RUN] Đã có {cached} file điểm trong {score_dir} (sẽ được dùng lại khi chạy tiếp)")
                print("[DRY-RUN OK] CV đã duyệt và JD/policy đủ cho tập chọn; CHƯA GỌI API.")
            else:
                if not args.model.startswith("gemini-"):
                    raise StudyError("Nghiên cứu chỉ cho phép một model Gemini; dùng --model gemini-...")
                from datetime import datetime, timezone
                started = datetime.now(timezone.utc).isoformat()
                summary = asyncio.run(run_study(
                    pairs, stage=args.stage, model=args.model, configs=configs,
                    extraction_dir=extraction_dir, score_dir=score_dir if run_dir else None,
                    run_tag=args.run_tag or None, keep_going=run_dir is not None))
                if run_dir is not None:
                    from app.core.config import get_settings
                    settings = get_settings()
                    prompt_files = {c: sha((BASE / "data" / "prompts" / f"prompt_{c}.txt").read_text(encoding="utf-8-sig").strip())
                                    for c in configs}
                    write_manifest(run_dir, {
                        "started_at_utc": started, "finished_at_utc": datetime.now(timezone.utc).isoformat(),
                        "run_tag": args.run_tag, "model": args.model, "use_fallback": False,
                        "temperature": settings.llm_temperature, "seed": settings.llm_seed,
                        "configs": list(configs), "prompt_versions": {c: PROMPT_VERSIONS[c] for c in configs},
                        "prompt_file_sha256": prompt_files,
                        "extraction_dir": str(extraction_dir), "extraction_versions": [FROZEN_EXTRACT_VERSIONS["cv"], FROZEN_EXTRACT_VERSIONS["jd"]],
                        "pairs": len(pairs), "limit": args.limit, "pair": args.pair or None,
                        "summary": {k: summary.get(k) for k in ("ok", "cached", "failed")},
                        "failures": summary.get("failures", []),
                        "score_files_totals": _sum_tokens(score_dir, pairs, configs),
                    })
                    print(f"[MANIFEST] {run_dir / 'run_manifest.json'}")
        elif args.command == "export":
            out = args.out
            if out is None:
                out = (run_dir / f"results_{args.run_tag or 'extra'}.csv") if run_dir else ORIGINAL_OUTPUT / "results_100_pairs_2_prompts.csv"
            if run_dir is not None and ORIGINAL_OUTPUT.resolve() in out.resolve().parents:
                raise StudyError(f"Không ghi CSV vào {ORIGINAL_OUTPUT}")
            done, missing = export_scores(pairs, out, configs=configs, score_dir=score_dir,
                                          extra_metrics=run_dir is not None)
            print(f"[EXPORT] {done}/{len(configs)*len(pairs)} kết quả, thiếu {missing}; file: {out}")
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
