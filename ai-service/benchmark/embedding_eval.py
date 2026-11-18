"""
Đo độ tương đồng embedding CV ↔ JD so với nhãn người gán và điểm LLM, trên 210 cặp của benchmark.

Mục đích (giai đoạn 4 của kế hoạch tìm kiếm vector): quyết định HIỂN THỊ độ tương đồng có đáng tin không và có
được phép DÙNG nó để bỏ qua bước chấm LLM (lọc sơ bộ) hay không. Nên đo hai thứ:
  1. Xếp hạng: độ tương đồng có tách Good Fit / Potential Fit khỏi No Fit không (AUC, Spearman).
  2. Lọc sơ bộ: nếu bỏ qua p% cặp có độ tương đồng thấp nhất thì mất bao nhiêu cặp Good / Potential Fit (recall).

Bốn cấu hình (CV × cách embed JD):
  - CV dạng văn bản thô  hoặc  CV dạng hồ sơ sản phẩm (`build_cv_profile`: kết quả trích xuất, bỏ thông tin liên hệ);
  - JD embed như truy vấn (RETRIEVAL_QUERY) hoặc như tài liệu (RETRIEVAL_DOCUMENT).
So với mốc: TF-IDF, từ khoá, và điểm LLM (Gemini) đã chạy sẵn.

Cần GOOGLE_API_KEY; embedding được lưu cache (results/.embedding_cache.json) nên chạy lại không gọi API.
Chạy:  python -m benchmark.embedding_eval
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.stats import spearmanr
from sklearn.metrics import roc_auc_score

from app.services.cv_indexing import build_cv_profile
from app.services.embeddings import RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, get_embedder
from app.services.scoring.prompt import JobInfo
from benchmark.common import DATA_DIR, RESULTS_DIR, read_jsonl, utf8_console

CACHE = RESULTS_DIR / ".embedding_cache.json"
OUT = RESULTS_DIR / "embedding_eval.json"
GEMINI_SCORES = RESULTS_DIR / "kaggle" / "gemini" / "scores.gemini.en.jsonl"
GEMINI_EXTRACTIONS = DATA_DIR.parent / "kaggle" / "gemini" / "extractions.gemini.en.jsonl"
BASELINES = RESULTS_DIR / "baselines"
MAX_CHARS = 8000
SKIP_FRACTIONS = (0.1, 0.2, 0.3, 0.4, 0.5)


def _load_cache() -> dict[str, list[float]]:
    return json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}


async def embed_cached(texts: list[str], task: str, cache: dict) -> list[list[float]]:
    """Embed có cache theo (model, task, nội dung); chỉ gọi API cho văn bản chưa có."""
    embedder = get_embedder()
    keys = [hashlib.sha256(f"{embedder.model_name}|{embedder.dimensions}|{task}|{t}".encode()).hexdigest() for t in texts]
    missing = [(k, t) for k, t in dict.fromkeys(zip(keys, texts)) if k not in cache]
    # Từng đợt nhỏ + ghi cache sau mỗi đợt: gặp giới hạn hạn mức giữa chừng thì lần chạy sau tiếp tục, không làm lại.
    for i in range(0, len(missing), 20):
        chunk = missing[i:i + 20]
        vectors = await embedder.embed([t for _, t in chunk], task)
        for (k, _), v in zip(chunk, vectors):
            cache[k] = v
        CACHE.write_text(json.dumps(cache), encoding="utf-8")
        print(f"  đã embed {min(i + 20, len(missing))}/{len(missing)} ({task})", flush=True)
    return [cache[k] for k in keys]


def _auc(labels: list[int], scores: list[float], positive) -> float | None:
    y = [1 if positive(l) else 0 for l in labels]
    return round(float(roc_auc_score(y, scores)), 3) if 0 < sum(y) < len(y) else None


def metrics(labels: list[int], scores: list[float]) -> dict:
    rho = spearmanr(labels, scores).statistic
    return {
        "n": len(labels),
        "auc_fit_vs_nofit": _auc(labels, scores, lambda l: l >= 1),
        "auc_good_vs_rest": _auc(labels, scores, lambda l: l == 2),
        "spearman_vs_label": round(float(rho), 3),
    }


def prefilter(labels: list[int], scores: list[float]) -> list[dict]:
    """Bỏ qua p% cặp điểm thấp nhất: giữ lại bao nhiêu % Good / Potential, loại được bao nhiêu % No Fit."""
    arr, lab = np.array(scores), np.array(labels)
    rows = []
    for p in SKIP_FRACTIONS:
        thr = float(np.quantile(arr, p))
        kept = arr >= thr
        rows.append({
            "skip": p, "threshold": round(thr, 4),
            "good_kept": round(float(kept[lab == 2].mean()), 3),
            "potential_kept": round(float(kept[lab == 1].mean()), 3),
            "nofit_skipped": round(float((~kept[lab == 0]).mean()), 3),
        })
    return rows


async def main() -> dict:
    utf8_console()
    pairs = read_jsonl(DATA_DIR / "pairs.jsonl")
    texts = {t["hash"]: t["text"] for t in read_jsonl(DATA_DIR / "texts_en.jsonl")}
    extractions = {r["resume_hash"]: r["result"] for r in read_jsonl(GEMINI_EXTRACTIONS) if r.get("ok") and r.get("result")}

    # Chỉ giữ cặp có đủ bản trích xuất CV để so cùng một tập cho mọi cấu hình.
    pairs = [p for p in pairs if p["resume_hash"] in extractions and p["resume_hash"] in texts and p["jd_hash"] in texts]
    cv_hashes = sorted({p["resume_hash"] for p in pairs})
    jd_hashes = sorted({p["jd_hash"] for p in pairs})
    print(f"{len(pairs)} cặp · {len(cv_hashes)} CV · {len(jd_hashes)} JD")

    cache = _load_cache()
    cv_raw = [texts[h][:MAX_CHARS] for h in cv_hashes]
    cv_prof = [build_cv_profile(extractions[h]).doc_text or texts[h][:MAX_CHARS] for h in cv_hashes]
    jd_txt = [JobInfo(title="", description=texts[h][:MAX_CHARS]).as_text() for h in jd_hashes]

    vec = {
        ("cv", "raw"): await embed_cached(cv_raw, RETRIEVAL_DOCUMENT, cache),
        ("cv", "profile"): await embed_cached(cv_prof, RETRIEVAL_DOCUMENT, cache),
        ("jd", "query"): await embed_cached(jd_txt, RETRIEVAL_QUERY, cache),
        ("jd", "document"): await embed_cached(jd_txt, RETRIEVAL_DOCUMENT, cache),
    }
    cv_idx = {h: i for i, h in enumerate(cv_hashes)}
    jd_idx = {h: i for i, h in enumerate(jd_hashes)}
    labels = [p["label_id"] for p in pairs]

    def cosine(cv_kind: str, jd_kind: str) -> list[float]:
        cv, jd = np.array(vec[("cv", cv_kind)]), np.array(vec[("jd", jd_kind)])
        return [float(cv[cv_idx[p["resume_hash"]]] @ jd[jd_idx[p["jd_hash"]]]) for p in pairs]  # vector đã chuẩn hoá

    configs: dict[str, list[float]] = {
        f"embedding: CV {c} / JD {j}": cosine(c, j) for c in ("raw", "profile") for j in ("query", "document")
    }

    # Mốc so sánh đã có sẵn trong benchmark.
    by_id = {p["id"]: i for i, p in enumerate(pairs)}
    for name in ("tfidf", "keyword"):
        rows = {r["pair_id"]: r for r in read_jsonl(BASELINES / f"{name}.en.jsonl") if r.get("ok")}
        if all(p["id"] in rows for p in pairs):
            configs[f"baseline: {name}"] = [rows[p["id"]]["total_score"] for p in pairs]
    llm = {}
    if GEMINI_SCORES.exists():
        llm = {r["pair_id"]: r["total_score"] for r in read_jsonl(GEMINI_SCORES) if r.get("ok")}
        if all(p["id"] in llm for p in pairs):
            configs["LLM: gemini chấm điểm"] = [llm[p["id"]] for p in pairs]

    report: dict = {"pairs": len(pairs), "labels": {str(k): labels.count(k) for k in (0, 1, 2)}, "configs": {}}
    print(f"\n{'cấu hình':<40} {'AUC fit/no':>10} {'AUC good':>9} {'Spearman':>9}" + ("  vs LLM" if llm else ""))
    for name, scores in configs.items():
        m = metrics(labels, scores)
        if name.startswith("embedding") and "LLM: gemini chấm điểm" in configs:
            m["spearman_vs_llm"] = round(float(spearmanr(scores, configs["LLM: gemini chấm điểm"]).statistic), 3)
        report["configs"][name] = m
        print(f"{name:<40} {m['auc_fit_vs_nofit']:>10} {m['auc_good_vs_rest']:>9} {m['spearman_vs_label']:>9}"
              + (f"  {m.get('spearman_vs_llm', '')}" if llm else ""))

    best = max((n for n in configs if n.startswith("embedding")), key=lambda n: report["configs"][n]["auc_fit_vs_nofit"])
    report["best_embedding_config"] = best
    report["prefilter"] = {"config": best, "rows": prefilter(labels, configs[best])}
    print(f"\nCấu hình embedding tốt nhất: {best}")
    print("Lọc sơ bộ — bỏ qua p% cặp điểm thấp nhất:")
    print(f"{'bỏ qua':>7} {'ngưỡng':>8} {'giữ Good':>9} {'giữ Potential':>14} {'loại No Fit':>12}")
    for r in report["prefilter"]["rows"]:
        print(f"{r['skip']:>7.0%} {r['threshold']:>8} {r['good_kept']:>9.1%} {r['potential_kept']:>14.1%} {r['nofit_skipped']:>12.1%}")

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nĐã ghi {OUT}")
    return report


if __name__ == "__main__":
    asyncio.run(main())
