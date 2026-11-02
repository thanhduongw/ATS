"""
Runner chạy trên Kaggle (quota AI Kaggle Benchmarks, SDK `kaggle_benchmarks`).

- `translate_all`: dịch các văn bản duy nhất EN → VI bằng model dịch (khác model chấm).
- `score_all`: với một model × một ngôn ngữ — trích xuất CV (LLM #1) rồi chấm từng cặp (LLM #2) bằng
  ĐÚNG code của ai-service (`app.services.cv_extraction_engine`, `app.services.scoring.engine`),
  gọi model qua provider `kbench:`.

Chạy tiếp được: mỗi kết quả ghi ngay một dòng JSONL; lần chạy sau đọc kết quả cũ (trong
/kaggle/working và các input đính kèm, vd output của lần chạy trước) và bỏ qua phần đã xong.
Lỗi từng mục được ghi lại (ok=false) để báo cáo, không làm dừng cả lượt chạy; lần sau thử lại mục lỗi.

Log chỉ in id / hash, trạng thái, thời gian — không in nội dung CV / JD.
"""

from __future__ import annotations

import asyncio
import re
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable

from benchmark.common import append_jsonl, find_files, read_jsonl

# [GIẢI THÍCH] Model DỊCH (Gemini 2.5 Flash) cố ý KHÁC model CHẤM, để không phải model tự dịch rồi tự chấm.
TRANSLATE_MODEL = "google/gemini-2.5-flash"
# [GIẢI THÍCH] Tên model trên Kaggle cho từng "khoá" lượt chạy. Kết quả hiện có chỉ của "gemini" (model của sản phẩm).
SCORING_MODELS = {
    "gemini": "google/gemini-3.5-flash-lite",          # model của sản phẩm
    "gpt": "openai/gpt-5.4-nano-2026-03-17",           # model nhỏ, giá rẻ của hãng khác để so sánh
                                                       # (Qwen3-235B qua Kaggle ~5 phút/cặp — quá chậm)
}
# Ngày chấm cố định cho mọi lượt chạy để kết quả lặp lại được (số năm "đến nay" tính theo ngày này).
BENCH_TODAY = date(2026, 10, 15)

# [GIẢI THÍCH] Prompt dịch: dịch đủ, giữ cấu trúc, GIỮ NGUYÊN tên công nghệ, công ty, trường, số liệu, ngày tháng;
# không thêm / bớt / tóm tắt. Văn bản gốc bọc trong <source>...</source>.
TRANSLATE_PROMPT = """Translate the following {kind} from English to Vietnamese for a recruitment system.
Rules:
- Translate everything; keep the original structure, line breaks and bullet points.
- Keep technical terms, tool / software / programming language names, certification names, company and
  school names, product names, acronyms, numbers, dates, percentages and currency exactly as in the source.
- Do not add, remove, summarise or explain anything. Output only the Vietnamese translation.

<source>
{text}
</source>"""

# [GIẢI THÍCH] Mẫu tìm các con số, dùng để kiểm tra bản dịch có giữ nguyên số liệu không.
_NUM = re.compile(r"\d+(?:[.,]\d+)?")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ============================================================
# Gọi model qua kaggle_benchmarks
# ============================================================

# [GIẢI THÍCH] Gọi model qua SDK kaggle_benchmarks (quota AI miễn phí của Kaggle), trả về văn bản thường (dùng cho dịch).
# Mỗi lời gọi mở một cuộc chat MỚI vì SDK mặc định nhớ lịch sử, tránh văn bản trước ảnh hưởng văn bản sau.
def kbench_text(model: str, message: str, seed: int = 42) -> str:
    """Một lời gọi văn bản thuần, trong chat riêng (llm.prompt mặc định giữ lịch sử hội thoại)."""
    import kaggle_benchmarks as kbench

    with kbench.chats.new(f"ats-{time.monotonic_ns()}"):
        out = kbench.llms[model].prompt(message, temperature=0, seed=seed)
    return out if isinstance(out, str) else str(out)


# ============================================================
# Dịch
# ============================================================

# [GIẢI THÍCH] KIỂM TRA CHẤT LƯỢNG BẢN DỊCH tự động:
# - Rỗng, độ dài bất thường (< 0.5 hoặc > 2.5 lần bản gốc), hay chép lại cả thẻ <source> -> LỖI NẶNG, bỏ bản dịch.
# - Độ dài hơi lệch (ngoài 0.8-1.8 lần) hoặc mất > 10% con số -> CẢNH BÁO, vẫn dùng nhưng ghi lại.
# Kết quả thật: 281/281 văn bản dịch được, 1 cảnh báo.
def translation_issues(source: str, translated: str) -> tuple[list[str], list[str]]:
    """(lỗi nặng → bản dịch hỏng, cảnh báo → vẫn dùng nhưng ghi lại)."""
    hard, warn = [], []
    if not translated or not translated.strip():
        return ["empty"], warn
    ratio = len(translated) / max(len(source), 1)
    if not 0.5 <= ratio <= 2.5:
        hard.append(f"length_ratio={ratio:.2f}")
    elif not 0.8 <= ratio <= 1.8:
        warn.append(f"length_ratio={ratio:.2f}")
    src_nums = set(_NUM.findall(source))
    if src_nums:
        kept = sum(n in translated or n.replace(".", ",") in translated or n.replace(",", ".") in translated
                   for n in src_nums) / len(src_nums)
        if kept < 0.9:
            warn.append(f"numbers_kept={kept:.2f}")
    if "<source>" in translated or "</source>" in translated:
        hard.append("prompt_echo")
    return hard, warn


# [GIẢI THÍCH] DỊCH TOÀN BỘ CV + JD sang tiếng Việt (notebook 01_translate gọi hàm này).
# - done: văn bản đã dịch xong ở lần chạy trước -> bỏ qua (hết quota thì chạy lại làm tiếp được).
# - Mỗi văn bản thử tối đa 2 lần; bản dịch lỗi nặng thì thử lại.
# - Ghi NGAY từng dòng vào translations_vi.jsonl. Log chỉ in mã văn bản, không in nội dung CV.
def translate_all(
    texts: list[dict],
    out_path: Path,
    prior_roots: list[Path],
    call: Callable[[str, str], str] | None = None,
    model: str = TRANSLATE_MODEL,
    limit: int | None = None,
    max_attempts: int = 2,
) -> dict:
    """Dịch các văn bản chưa có bản dịch ok. Trả thống kê."""
    call = call or kbench_text
    done = {r["hash"] for p in find_files(prior_roots, out_path.name) for r in read_jsonl(p) if r.get("ok")}
    todo = [t for t in texts if t["hash"] not in done][: limit or None]
    stats = {"already_done": len(done), "todo": len(todo), "ok": 0, "failed": 0}
    print(f"Dịch: đã có {len(done)}, cần dịch {len(todo)} (model {model})")
    for i, t in enumerate(todo, 1):
        row = {"hash": t["hash"], "type": t["type"], "model": model, "at": now()}
        started = time.monotonic()
        # Thử dịch; không có lỗi nặng thì dừng (break), có thì thử lần nữa.
        for attempt in range(1, max_attempts + 1):
            try:
                kind = "CV / resume" if t["type"] == "CV" else "job description"
                vi = call(model, TRANSLATE_PROMPT.format(kind=kind, text=t["text"]))
                hard, warn = translation_issues(t["text"], vi)
                row.update(text=vi, ok=not hard, issues=hard + warn, attempts=attempt, error=None)
                if not hard:
                    break
            except Exception as exc:  # noqa: BLE001
                row.update(text=None, ok=False, issues=[], attempts=attempt, error=f"{type(exc).__name__}: {exc}"[:500])
        row["seconds"] = round(time.monotonic() - started, 1)
        append_jsonl(out_path, row)
        stats["ok" if row["ok"] else "failed"] += 1
        print(f"[{i}/{len(todo)}] {t['type']} {t['hash']} ok={row['ok']} {row['seconds']}s {row.get('issues') or ''}"
              f"{' ' + row['error'][:80] if row.get('error') else ''}")
    return stats


# [GIẢI THÍCH] Đọc bản dịch đã lưu: trả về {mã văn bản: bản dịch tiếng Việt} để lượt chấm tiếng Việt dùng.
def load_translations(roots: list[Path], name: str = "translations_vi.jsonl") -> dict[str, str]:
    """hash → bản dịch ok (bản mới nhất thắng)."""
    out: dict[str, str] = {}
    for path in find_files(roots, name):
        for r in read_jsonl(path):
            if r.get("ok") and r.get("text"):
                out[r["hash"]] = r["text"]
    return out


# ============================================================
# Chấm điểm
# ============================================================

@dataclass
# [GIẢI THÍCH] CẤU HÌNH MỘT LƯỢT CHẤM = 1 model x 1 ngôn ngữ (vd gemini + vi).
# tag = "r2", "r3" cho các lượt chấm lặp đo độ ổn định. today cố định 15/10/2026 để số năm kinh nghiệm
# luôn tính giống nhau. Mỗi lượt có 2 file kết quả: extractions.<model>.<ngôn ngữ>.jsonl và scores.<...>.jsonl.
class RunConfig:
    model_key: str                 # "gemini" | "gpt"
    lang: str                      # "en" | "vi"
    out_dir: Path
    prior_roots: list[Path]
    tag: str = ""                  # "" = lượt chính; "r2", "r3" = chấm lặp (độ ổn định)
    today: date = BENCH_TODAY

    @property
    def model(self) -> str:
        return SCORING_MODELS[self.model_key]

    @property
    def extraction_file(self) -> str:
        return f"extractions.{self.model_key}.{self.lang}.jsonl"

    @property
    def score_file(self) -> str:
        return f"scores.{self.model_key}.{self.lang}{'.' + self.tag if self.tag else ''}.jsonl"


# [GIẢI THÍCH] Đọc kết quả đã có (lần chạy trước + lần này), CHỈ lấy dòng thành công (ok).
# Nhờ vậy hết quota giữa chừng thì lần sau chỉ làm phần còn thiếu; dòng lỗi sẽ được làm lại.
def _load_ok(roots: list[Path], name: str, key: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for path in find_files(roots, name):
        for r in read_jsonl(path):
            if r.get("ok"):
                out[r[key]] = r
    return out


# [GIẢI THÍCH] TRÍCH XUẤT + CHẤM mọi cặp chưa chấm, bằng ĐÚNG code ai-service (3 dòng import bên dưới).
# Với mỗi cặp: CV chưa trích xuất -> GỌI AI LẦN 1 (extract_cv_from_text) và lưu;
# rồi GỌI AI LẦN 2 + Python tính điểm (score_candidate) dựa trên KẾT QUẢ TRÍCH XUẤT. Lưu kèm nhãn thật để so sánh.
async def score_all(
    cfg: RunConfig,
    pairs: list[dict],
    texts: dict[str, str],
    manager=None,
    limit: int | None = None,
) -> dict:
    """Trích xuất + chấm các cặp chưa có kết quả ok. `texts`: hash → văn bản đúng ngôn ngữ của lượt chạy."""
    from app.core.llm_client import LLMManager, make_client
    from app.services.cv_extraction_engine import extract_cv_from_text
    from app.services.scoring.engine import score_candidate
    from app.services.scoring.prompt import JobInfo

    # "kbench:" = gọi model qua quota Kaggle (lớp KbenchClient trong llm_client.py).
    # use_fallback=False: chỉ dùng đúng một model, không chuyển model khác khi lỗi (kết quả không bị trộn).
    manager = manager or LLMManager(primary=make_client(f"kbench:{cfg.model}"), use_fallback=False)
    roots = [*cfg.prior_roots, cfg.out_dir]
    # Kết quả đã có: CV đã trích xuất (theo mã CV) và cặp đã chấm (theo mã cặp).
    extractions = _load_ok(roots, cfg.extraction_file, "resume_hash")
    scored = _load_ok(roots, cfg.score_file, "pair_id")

    # todo = các cặp CHƯA chấm; bỏ cặp thiếu văn bản (vd bản dịch lỗi); limit dùng khi chạy thử vài cặp.
    todo = [p for p in pairs if p["id"] not in scored]
    missing_text = [p["id"] for p in todo if p["resume_hash"] not in texts or p["jd_hash"] not in texts]
    todo = [p for p in todo if p["id"] not in missing_text][: limit or None]
    stats = {"already_done": len(scored), "todo": len(todo), "missing_text": len(missing_text),
             "ok": 0, "failed": 0, "extract_failed": 0}
    print(f"Chấm {cfg.model_key}/{cfg.lang}{'/' + cfg.tag if cfg.tag else ''}: đã có {len(scored)}, "
          f"cần chấm {len(todo)}, thiếu văn bản {len(missing_text)}")

    # ----- Duyệt từng cặp (i đếm từ 1 để in tiến độ) -----
    for i, pair in enumerate(todo, 1):
        # ----- LLM LẦN 1: TRÍCH XUẤT CV, chỉ khi CV này chưa có -----
        # Mỗi CV chỉ trích xuất 1 lần cho mỗi ngôn ngữ (177 lần cho 210 cặp), cặp sau dùng chung CV thì dùng lại.
        rh = pair["resume_hash"]
        if rh not in extractions:
            started = time.monotonic()
            row = {"resume_hash": rh, "model": cfg.model, "lang": cfg.lang, "at": now()}
            try:
                # GỌI AI LẦN 1: đúng hàm trích xuất của ai-service (CV ở đây đã là văn bản, không qua S3 / OCR).
                result, usage = await extract_cv_from_text(texts[rh], manager)
                row.update(ok=True, result=result.model_dump(mode="json"), retries=usage.retries, error=None)
            except Exception as exc:  # noqa: BLE001
                row.update(ok=False, result=None, error=f"{type(exc).__name__}: {exc}"[:500])
            row["seconds"] = round(time.monotonic() - started, 1)
            # Ghi NGAY một dòng xuống ổ đĩa: máy Kaggle dừng giữa chừng cũng không mất phần đã làm.
            append_jsonl(cfg.out_dir / cfg.extraction_file, row)
            if row["ok"]:
                extractions[rh] = row
            else:
                stats["extract_failed"] += 1

        started = time.monotonic()
        # ----- LLM LẦN 2: CHẤM (cặp nào cũng chấm) -----
        # label_id = nhãn thật của bộ dữ liệu (0/1/2), lưu cạnh điểm để evaluate.py so sánh.
        row = {"pair_id": pair["id"], "split": pair["split"], "label_id": pair["label_id"],
               "model": cfg.model, "lang": cfg.lang, "tag": cfg.tag, "at": now()}
        if rh not in extractions:
            # Trích xuất hỏng thì ghi lỗi, không chấm bừa.
            row.update(ok=False, error="extraction_failed")
        else:
            try:
                # GỌI AI LẦN 2 + Python tính điểm: đúng hàm chấm của ai-service (lọc thông tin cá nhân -> số năm -> Gemini -> điểm).
                # title="": JD trong bộ dữ liệu chỉ là một khối văn bản; đưa vào KẾT QUẢ TRÍCH XUẤT chứ không phải CV gốc.
                result, prov = await score_candidate(
                    JobInfo(title="", description=texts[pair["jd_hash"]]),
                    extractions[rh]["result"]["extracted_cv"],
                    manager,
                    cfg.today,
                )
                row.update(ok=True, total_score=result.total_score, tier=result.tier.value,
                           result=result.model_dump(mode="json"), provenance=prov.model_dump(mode="json"),
                           error=None)
            except Exception as exc:  # noqa: BLE001
                row.update(ok=False, error=f"{type(exc).__name__}: {exc}"[:500])
        row["seconds"] = round(time.monotonic() - started, 1)
        # Ghi NGAY kết quả chấm (điểm, xếp loại, 5 tiêu chí, model, phiên bản prompt) vào scores.*.jsonl.
        append_jsonl(cfg.out_dir / cfg.score_file, row)
        stats["ok" if row["ok"] else "failed"] += 1
        print(f"[{i}/{len(todo)}] {pair['id']} ok={row['ok']} {row.get('total_score', '')} {row['seconds']}s"
              f"{' ' + row['error'][:80] if row.get('error') else ''}")
    return stats


# [GIẢI THÍCH] Notebook gọi hàm này. Code ai-service viết kiểu bất đồng bộ (async), mà Jupyter đã có sẵn
# vòng lặp sự kiện riêng nên không gọi trực tiếp được -> chạy score_all trong một luồng riêng rồi trả kết quả.
def run_scoring(cfg: RunConfig, pairs: list[dict], texts: dict[str, str], limit: int | None = None) -> dict:
    """Bản đồng bộ cho notebook (Jupyter đã có event loop → chạy trong thread riêng)."""
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(1) as pool:
        return pool.submit(lambda: asyncio.run(score_all(cfg, pairs, texts, limit=limit))).result()
