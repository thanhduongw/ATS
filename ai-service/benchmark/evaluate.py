"""
Tính chỉ số benchmark từ kết quả đã lưu (không gọi LLM).

Nguồn:
- AI: benchmark/results/kaggle/**/scores.<model>.<lang>[.<tag>].jsonl (output tải về từ Kaggle)
- Baseline: benchmark/results/baselines/<method>.<lang>.jsonl

Cho mỗi cấu hình (phương pháp × ngôn ngữ):
- chọn 2 ngưỡng (Chưa phù hợp | Tiềm năng | Phù hợp tốt) trên tập calib, tối đa macro-F1;
- báo trên tập test: accuracy, macro-F1, P/R/F1 từng nhãn, ma trận nhầm lẫn, QWK, Spearman,
  khoảng tin cậy 95% (bootstrap); AI còn báo thêm kết quả với ngưỡng tạm của sản phẩm (70 / 50).
So sánh cặp (McNemar, đúng/sai trên CÙNG các cặp mà hai bên đều có kết quả): AI vs TF-IDF, Anh vs Việt,
Gemini vs GPT-5.4 nano. Độ ổn định: lượt chính so với các lượt r2 / r3. Tỉ lệ lỗi, thời gian.

Chạy:  python -m benchmark.evaluate      → benchmark/results/summary.json
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy.stats import binomtest, spearmanr

from benchmark.common import DATA_DIR, LABELS, RESULTS_DIR, read_jsonl, utf8_console

KAGGLE_DIR = RESULTS_DIR / "kaggle"
BASELINE_DIR = RESULTS_DIR / "baselines"
PRODUCT_THRESHOLDS = (45.0, 65.0)          # ngưỡng đang cấu hình trong sản phẩm (potential_min, good_min)
BOOTSTRAP = 1000
SEED = 20261015
PRODUCT_CONFIG = "gemini/vi"               # cấu hình dùng để đề xuất ngưỡng cho sản phẩm (CV chủ yếu tiếng Việt)


# ============================================================
# Chỉ số
# ============================================================

def to_label(score: float, t_low: float, t_high: float) -> int:
    return 2 if score >= t_high else 1 if score >= t_low else 0


def confusion(labels: list[int], preds: list[int]) -> list[list[int]]:
    m = [[0] * 3 for _ in range(3)]
    for y, p in zip(labels, preds):
        m[y][p] += 1
    return m


def per_label(cm: list[list[int]]) -> dict:
    out = {}
    for k, name in enumerate(LABELS):
        tp = cm[k][k]
        fp = sum(cm[i][k] for i in range(3)) - tp
        fn = sum(cm[k]) - tp
        p = tp / (tp + fp) if tp + fp else 0.0
        r = tp / (tp + fn) if tp + fn else 0.0
        out[name] = {"precision": p, "recall": r, "f1": 2 * p * r / (p + r) if p + r else 0.0, "support": tp + fn}
    return out


def macro_f1(labels: list[int], preds: list[int]) -> float:
    return float(np.mean([v["f1"] for v in per_label(confusion(labels, preds)).values()]))


def accuracy(labels: list[int], preds: list[int]) -> float:
    return float(np.mean([y == p for y, p in zip(labels, preds)])) if labels else 0.0


def quadratic_kappa(labels: list[int], preds: list[int]) -> float:
    cm = np.array(confusion(labels, preds), dtype=float)
    n = cm.sum()
    if n == 0:
        return 0.0
    w = np.array([[(i - j) ** 2 / 4 for j in range(3)] for i in range(3)])
    expected = np.outer(cm.sum(1), cm.sum(0)) / n
    denom = (w * expected).sum()
    return float(1 - (w * cm).sum() / denom) if denom else 0.0


def tune_thresholds(scores: list[float], labels: list[int]) -> tuple[float, float]:
    """2 ngưỡng tối đa macro-F1 trên calib; hoà thì chọn accuracy cao hơn, rồi ngưỡng gần (50, 70) hơn."""
    values = sorted(set(scores))
    cands = sorted({round((a + b) / 2, 2) for a, b in zip(values, values[1:])} | {values[0], values[-1] + 0.01})
    best, best_key = PRODUCT_THRESHOLDS, None
    for i, lo in enumerate(cands):
        for hi in cands[i:]:
            preds = [to_label(s, lo, hi) for s in scores]
            key = (round(macro_f1(labels, preds), 6), round(accuracy(labels, preds), 6),
                   -abs(lo - PRODUCT_THRESHOLDS[0]) - abs(hi - PRODUCT_THRESHOLDS[1]))
            if best_key is None or key > best_key:
                best, best_key = (lo, hi), key
    return best


def bootstrap_ci(labels: list[int], preds: list[int]) -> dict:
    rng = np.random.default_rng(SEED)
    y, p = np.array(labels), np.array(preds)
    accs, f1s = [], []
    for _ in range(BOOTSTRAP):
        idx = rng.integers(0, len(y), len(y))
        accs.append(accuracy(list(y[idx]), list(p[idx])))
        f1s.append(macro_f1(list(y[idx]), list(p[idx])))
    q = lambda v: [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))]  # noqa: E731
    return {"accuracy": q(accs), "macro_f1": q(f1s)}


def classification(labels: list[int], preds: list[int], scores: list[float]) -> dict:
    cm = confusion(labels, preds)
    rho = spearmanr(scores, labels).statistic if len(set(scores)) > 1 else float("nan")
    return {
        "n": len(labels),
        "accuracy": accuracy(labels, preds),
        "macro_f1": macro_f1(labels, preds),
        "qwk": quadratic_kappa(labels, preds),
        "spearman": float(rho),
        "per_label": per_label(cm),
        "confusion": cm,
        "ci95": bootstrap_ci(labels, preds),
    }


def mcnemar(correct_a: list[bool], correct_b: list[bool]) -> dict:
    """McNemar chính xác (nhị thức) trên các cặp bất đồng."""
    b = sum(a and not c for a, c in zip(correct_a, correct_b))
    c = sum(c and not a for a, c in zip(correct_a, correct_b))
    p = binomtest(b, b + c, 0.5).pvalue if b + c else 1.0
    return {"n": len(correct_a), "a_only_correct": b, "b_only_correct": c, "p_value": float(p)}


# ============================================================
# Đọc kết quả
# ============================================================

def load_runs() -> dict[str, dict[str, dict]]:
    """key "phương pháp/ngôn ngữ[/tag]" → pair_id → dòng kết quả (ok mới nhất thắng; lỗi giữ nếu chưa có ok)."""
    runs: dict[str, dict[str, dict]] = defaultdict(dict)

    def add(key: str, rows: list[dict]) -> None:
        for r in rows:
            cur = runs[key].get(r["pair_id"])
            if cur is None or (r.get("ok") and not cur.get("ok")) or (r.get("ok") and cur.get("ok")):
                runs[key][r["pair_id"]] = r

    for path in sorted(KAGGLE_DIR.rglob("scores.*.jsonl")):
        parts = path.name.split(".")          # scores.<model>.<lang>[.<tag>].jsonl
        add("/".join(parts[1:-1]), read_jsonl(path))
    for path in sorted(BASELINE_DIR.glob("*.jsonl")):
        method, lang = path.name.split(".")[:2]
        add(f"{method}/{lang}", read_jsonl(path))
    return dict(runs)


def load_extraction_stats() -> dict:
    stats = {}
    for path in sorted(KAGGLE_DIR.rglob("extractions.*.jsonl")):
        key = "/".join(path.name.split(".")[1:3])
        rows = {}
        for r in read_jsonl(path):
            if r.get("ok") or r["resume_hash"] not in rows:
                rows[r["resume_hash"]] = r
        s = stats.setdefault(key, {"cv": 0, "ok": 0, "seconds": []})
        s["cv"] += len(rows)
        s["ok"] += sum(r.get("ok", False) for r in rows.values())
        s["seconds"] += [r["seconds"] for r in rows.values() if r.get("ok") and "seconds" in r]
    return {k: {"cv": v["cv"], "ok": v["ok"], "failed": v["cv"] - v["ok"],
                "median_seconds": float(np.median(v["seconds"])) if v["seconds"] else None}
            for k, v in stats.items()}


# ============================================================
# Đánh giá
# ============================================================

def evaluate_config(rows: dict[str, dict], pairs: dict[str, dict], is_ai: bool) -> dict:
    ok = {pid: r for pid, r in rows.items() if r.get("ok")}
    by_split = {s: [pid for pid, p in pairs.items() if p["split"] == s] for s in ("calib", "test")}
    calib = [pid for pid in by_split["calib"] if pid in ok]
    test = [pid for pid in by_split["test"] if pid in ok]
    out = {"coverage": {s: {"ok": len([p for p in by_split[s] if p in ok]),
                            "attempted": len([p for p in by_split[s] if p in rows]),
                            "total": len(by_split[s])} for s in by_split}}
    if len(calib) < 3 or len(test) < 3:
        out["skipped"] = "chưa đủ kết quả"
        return out
    thresholds = tune_thresholds([ok[p]["total_score"] for p in calib], [pairs[p]["label_id"] for p in calib])
    labels = [pairs[p]["label_id"] for p in test]
    scores = [ok[p]["total_score"] for p in test]
    preds = [to_label(s, *thresholds) for s in scores]
    out["thresholds"] = {"potential_min": thresholds[0], "good_min": thresholds[1]}
    out["test"] = classification(labels, preds, scores)
    out["test_correct"] = {p: pr == y for p, pr, y in zip(test, preds, labels)}
    if is_ai:
        prod = [to_label(s, *PRODUCT_THRESHOLDS) for s in scores]
        out["test_product_thresholds"] = classification(labels, prod, scores)
        secs = [ok[p]["seconds"] for p in test + calib if "seconds" in ok[p]]
        out["median_seconds"] = float(np.median(secs)) if secs else None
        out["errors"] = sorted({r.get("error", "")[:120] for r in rows.values() if not r.get("ok")})[:10]
    return out


def compare(results: dict, a: str, b: str) -> dict | None:
    ca, cb = results.get(a, {}).get("test_correct"), results.get(b, {}).get("test_correct")
    if not ca or not cb:
        return None
    common = sorted(set(ca) & set(cb))
    res = mcnemar([ca[p] for p in common], [cb[p] for p in common])
    res.update(a=a, b=b, accuracy_a=float(np.mean([ca[p] for p in common])),
               accuracy_b=float(np.mean([cb[p] for p in common])))
    return res


def stability(runs: dict[str, dict[str, dict]], base: str = "gemini/vi") -> dict | None:
    tags = sorted(k for k in runs if k.startswith(base + "/"))
    if not tags:
        return None
    main_ok = {p: r for p, r in runs.get(base, {}).items() if r.get("ok")}
    out = {}
    for tag in tags:
        other = {p: r for p, r in runs[tag].items() if r.get("ok")}
        common = sorted(set(main_ok) & set(other))
        if not common:
            continue
        diffs = [abs(main_ok[p]["total_score"] - other[p]["total_score"]) for p in common]
        same_tier = [main_ok[p]["tier"] == other[p]["tier"] for p in common]
        levels = lambda r: [d["level"] for d in r["result"]["dimensions"]]  # noqa: E731
        same_levels = [levels(main_ok[p]) == levels(other[p]) for p in common]
        out[tag] = {"n": len(common), "mean_abs_diff": float(np.mean(diffs)), "max_abs_diff": float(max(diffs)),
                    "same_tier": float(np.mean(same_tier)), "same_all_levels": float(np.mean(same_levels))}
    return out or None


def main() -> dict:
    utf8_console()
    pairs = {p["id"]: p for p in read_jsonl(DATA_DIR / "pairs.jsonl")}
    runs = load_runs()
    results = {}
    for key in sorted(k for k in runs if k.count("/") == 1):
        method = key.split("/")[0]
        results[key] = evaluate_config(runs[key], pairs, is_ai=method in ("gemini", "gpt"))
    comparisons = [c for c in (
        compare(results, "gemini/en", "tfidf/en"), compare(results, "gemini/vi", "tfidf/vi"),
        compare(results, "gemini/en", "gemini/vi"), compare(results, "gpt/en", "gpt/vi"),
        compare(results, "gemini/en", "gpt/en"), compare(results, "gemini/vi", "gpt/vi"),
    ) if c]
    product = results.get(PRODUCT_CONFIG, {}).get("thresholds")
    summary = {
        "pairs": {"calib": sum(p["split"] == "calib" for p in pairs.values()),
                  "test": sum(p["split"] == "test" for p in pairs.values())},
        "product_thresholds_current": {"potential_min": PRODUCT_THRESHOLDS[0], "good_min": PRODUCT_THRESHOLDS[1]},
        "product_thresholds_recommended": product,
        "results": {k: {kk: vv for kk, vv in v.items() if kk != "test_correct"} for k, v in results.items()},
        "comparisons": comparisons,
        "stability": stability(runs),
        "extraction": load_extraction_stats(),
    }
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"{'cấu hình':14} {'test':>5} {'acc':>6} {'macroF1':>8} {'QWK':>6}  ngưỡng (calib)")
    for key, r in summary["results"].items():
        if "test" in r:
            t = r["test"]
            print(f"{key:14} {t['n']:>5} {t['accuracy']:>6.3f} {t['macro_f1']:>8.3f} {t['qwk']:>6.3f}  "
                  f"{r['thresholds']['potential_min']:g} / {r['thresholds']['good_min']:g}")
        else:
            print(f"{key:14} {r.get('skipped')}  {r['coverage']}")
    print("Ngưỡng đề xuất cho sản phẩm:", product)
    return summary


if __name__ == "__main__":
    main()
