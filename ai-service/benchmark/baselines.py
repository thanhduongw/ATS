"""
Các mốc so sánh không dùng LLM: ngẫu nhiên, đếm từ khoá, TF-IDF cosine.

Mỗi baseline cho điểm 0–100 cho từng cặp; bộ đánh giá xử lý như kết quả AI (chọn ngưỡng trên calib,
báo trên test). Tiếng Việt dùng bản dịch tải về từ Kaggle (cặp thiếu bản dịch bị bỏ).

Chạy:  python -m benchmark.baselines
"""

from __future__ import annotations

import random
import re
import unicodedata

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from benchmark.common import DATA_DIR, RESULTS_DIR, read_jsonl, write_jsonl

KAGGLE_DIR = RESULTS_DIR / "kaggle"
OUT_DIR = RESULTS_DIR / "baselines"
SEED = 20261015

_TOKEN = re.compile(r"\w+", re.UNICODE)
_STOP = {
    "en": set("""a an and are as at be by for from has have in is it of on or that the this to was were will with
                 you your we our they their he she his her i my me us able etc using use work working""".split()),
    "vi": set("""và của là có cho các những được trong với một này để không theo từ khi về như tại làm việc
                 đã sẽ cũng bạn chúng tôi họ""".split()),
}


def tokens(text: str, lang: str) -> list[str]:
    text = unicodedata.normalize("NFC", text.lower())
    return [t for t in _TOKEN.findall(text) if len(t) > 1 and not t.isdigit() and t not in _STOP[lang]]


def keyword_score(resume: str, jd: str, lang: str) -> float:
    """% từ khoá (từ đơn) của JD xuất hiện trong CV."""
    jd_terms = set(tokens(jd, lang))
    if not jd_terms:
        return 0.0
    return round(100 * len(jd_terms & set(tokens(resume, lang))) / len(jd_terms), 2)


def tfidf_scores(pairs: list[dict], texts: dict[str, str], lang: str) -> list[float]:
    docs = sorted({h for p in pairs for h in (p["resume_hash"], p["jd_hash"])})
    vec = TfidfVectorizer(tokenizer=lambda t: tokens(t, lang), lowercase=False, token_pattern=None,
                          ngram_range=(1, 2), sublinear_tf=True, min_df=1)
    matrix = vec.fit_transform([texts[h] for h in docs])
    index = {h: i for i, h in enumerate(docs)}
    return [round(100 * float(cosine_similarity(matrix[index[p["resume_hash"]]], matrix[index[p["jd_hash"]]])[0, 0]), 2)
            for p in pairs]


def load_texts(lang: str) -> dict[str, str]:
    if lang == "en":
        return {t["hash"]: t["text"] for t in read_jsonl(DATA_DIR / "texts_en.jsonl")}
    out: dict[str, str] = {}
    for path in sorted(KAGGLE_DIR.rglob("translations_vi.jsonl")):
        for r in read_jsonl(path):
            if r.get("ok") and r.get("text"):
                out[r["hash"]] = r["text"]
    return out


def run(lang: str) -> int:
    texts = load_texts(lang)
    pairs = [p for p in read_jsonl(DATA_DIR / "pairs.jsonl") if p["resume_hash"] in texts and p["jd_hash"] in texts]
    if not pairs:
        print(f"[{lang}] chưa có văn bản — bỏ qua")
        return 0
    rng = random.Random(SEED)
    scores = {
        "random": [round(rng.uniform(0, 100), 2) for _ in pairs],
        "keyword": [keyword_score(texts[p["resume_hash"]], texts[p["jd_hash"]], lang) for p in pairs],
        "tfidf": tfidf_scores(pairs, texts, lang),
    }
    for method, values in scores.items():
        write_jsonl(OUT_DIR / f"{method}.{lang}.jsonl", (
            {"pair_id": p["id"], "split": p["split"], "label_id": p["label_id"], "ok": True, "total_score": s}
            for p, s in zip(pairs, values)))
    print(f"[{lang}] {len(pairs)} cặp → {', '.join(scores)}")
    return len(pairs)


def main() -> None:
    for lang in ("en", "vi"):
        run(lang)


if __name__ == "__main__":
    main()
