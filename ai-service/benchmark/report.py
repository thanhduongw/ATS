"""
Sinh báo cáo HTML từ benchmark/results/summary.json.

Chạy:  python -m benchmark.report      → benchmark/results/report.html
"""

from __future__ import annotations

import html
import json
from datetime import datetime

from benchmark.common import LABELS_VI, RESULTS_DIR

NAMES = {"gemini": "Gemini 3.5 Flash-Lite (sản phẩm)", "qwen": "Qwen3-235B (mã nguồn mở)",
         "tfidf": "TF-IDF cosine", "keyword": "Đếm từ khoá", "random": "Ngẫu nhiên"}
LANGS = {"en": "Tiếng Anh", "vi": "Tiếng Việt (bản dịch)"}


def e(x) -> str:
    return html.escape(str(x))


def pct(x) -> str:
    return "—" if x is None else f"{100 * x:.1f}%"


def label(key: str) -> str:
    method, lang = key.split("/")[:2]
    return f"{NAMES.get(method, method)} · {LANGS.get(lang, lang)}"


def results_table(results: dict) -> str:
    rows = []
    ordered = sorted(results.items(), key=lambda kv: -(kv[1].get("test", {}).get("macro_f1") or -1))
    for key, r in ordered:
        cov = r["coverage"]["test"]
        if "test" not in r:
            rows.append(f"<tr><td>{e(label(key))}</td><td colspan=7 class=muted>{e(r.get('skipped'))} "
                        f"(test {cov['ok']}/{cov['total']})</td></tr>")
            continue
        t, ci = r["test"], r["test"]["ci95"]
        bar = f"<span class=bar style='width:{100 * t['macro_f1']:.0f}%'></span>"
        rows.append(
            f"<tr><td>{e(label(key))}</td><td class=num>{cov['ok']}/{cov['total']}</td>"
            f"<td class=num>{pct(t['accuracy'])}<small>{pct(ci['accuracy'][0])}–{pct(ci['accuracy'][1])}</small></td>"
            f"<td class=num><div class=cell>{bar}<b>{pct(t['macro_f1'])}</b></div>"
            f"<small>{pct(ci['macro_f1'][0])}–{pct(ci['macro_f1'][1])}</small></td>"
            f"<td class=num>{t['qwk']:.3f}</td><td class=num>{t['spearman']:.3f}</td>"
            f"<td class=num>{r['thresholds']['potential_min']:g} / {r['thresholds']['good_min']:g}</td>"
            f"<td class=num>{pct(r['test_product_thresholds']['macro_f1']) if 'test_product_thresholds' in r else '—'}</td></tr>")
    return ("<table><thead><tr><th>Cấu hình</th><th>Test có kết quả</th><th>Accuracy<small>CI 95%</small></th>"
            "<th>Macro-F1<small>CI 95%</small></th><th>QWK</th><th>Spearman</th><th>Ngưỡng (calib)</th>"
            "<th>Macro-F1 ngưỡng 50/70</th></tr></thead><tbody>" + "".join(rows) + "</tbody></table>")


def confusion_block(key: str, r: dict) -> str:
    cm = r["test"]["confusion"]
    head = "".join(f"<th>{e(x)}</th>" for x in LABELS_VI)
    body = "".join(f"<tr><th>{e(LABELS_VI[i])}</th>" + "".join(
        f"<td class='num{' diag' if i == j else ''}'>{cm[i][j]}</td>" for j in range(3)) + "</tr>" for i in range(3))
    per = r["test"]["per_label"]
    recall = " · ".join(f"{e(LABELS_VI[i])}: P {pct(v['precision'])} / R {pct(v['recall'])}"
                        for i, v in enumerate(per.values()))
    return (f"<div class=card><h3>{e(label(key))}</h3><table class=cm><thead><tr><th>Nhãn \\ Dự đoán</th>{head}"
            f"</tr></thead><tbody>{body}</tbody></table><p class=muted>{recall}</p></div>")


def comparisons_table(items: list[dict]) -> str:
    if not items:
        return "<p class=muted>Chưa đủ kết quả để so sánh.</p>"
    rows = "".join(
        f"<tr><td>{e(label(c['a']))}</td><td>{e(label(c['b']))}</td><td class=num>{c['n']}</td>"
        f"<td class=num>{pct(c['accuracy_a'])}</td><td class=num>{pct(c['accuracy_b'])}</td>"
        f"<td class=num>{c['a_only_correct']} / {c['b_only_correct']}</td>"
        f"<td class=num>{c['p_value']:.4f}{' ✱' if c['p_value'] < 0.05 else ''}</td></tr>" for c in items)
    return ("<table><thead><tr><th>A</th><th>B</th><th>Cặp chung</th><th>Acc A</th><th>Acc B</th>"
            "<th>Chỉ A đúng / chỉ B đúng</th><th>p (McNemar)</th></tr></thead><tbody>" + rows +
            "</tbody></table><p class=muted>✱ khác biệt có ý nghĩa thống kê (p &lt; 0,05). "
            "So trên đúng các cặp mà cả hai bên đều có kết quả.</p>")


def main() -> None:
    s = json.loads((RESULTS_DIR / "summary.json").read_text(encoding="utf-8"))
    ai = [(k, r) for k, r in s["results"].items() if k.split("/")[0] in ("gemini", "qwen") and "test" in r]
    rec, cur = s.get("product_thresholds_recommended"), s["product_thresholds_current"]
    stab = s.get("stability") or {}
    stab_rows = "".join(
        f"<tr><td>{e(tag)}</td><td class=num>{v['n']}</td><td class=num>{v['mean_abs_diff']:.2f}</td>"
        f"<td class=num>{v['max_abs_diff']:.1f}</td><td class=num>{pct(v['same_tier'])}</td>"
        f"<td class=num>{pct(v['same_all_levels'])}</td></tr>" for tag, v in stab.items())
    def seconds(v: dict) -> str:
        return "—" if v["median_seconds"] is None else f"{v['median_seconds']:.1f}"

    ext_rows = "".join(
        f"<tr><td>{e(label(k))}</td><td class=num>{v['cv']}</td><td class=num>{v['failed']}</td>"
        f"<td class=num>{seconds(v)}</td></tr>"
        for k, v in s.get("extraction", {}).items())

    page = f"""<!doctype html><html lang=vi><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>Benchmark chấm điểm CV</title>
<style>
:root{{--bg:#f7f7f5;--fg:#1d1d1b;--muted:#6b6b66;--card:#fff;--line:#e3e2dd;--accent:#4f46e5;--diag:#e0e7ff}}
@media (prefers-color-scheme:dark){{:root{{--bg:#151514;--fg:#ececea;--muted:#a3a29c;--card:#1f1f1d;--line:#34332f;--accent:#a5b4fc;--diag:#2e3366}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}}
main{{max-width:1080px;margin:0 auto;padding:32px 16px 64px}}
h1{{font-size:26px;margin:0 0 4px}} h2{{font-size:19px;margin:36px 0 12px}} h3{{font-size:15px;margin:0 0 8px}}
.muted{{color:var(--muted);font-size:13px}} small{{display:block;color:var(--muted);font-size:11.5px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin:12px 0;overflow-x:auto}}
table{{border-collapse:collapse;width:100%;font-size:13.5px}} th,td{{padding:7px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}}
th{{font-weight:600}} .num{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
.cell{{position:relative;min-width:90px}} .bar{{position:absolute;inset:0 auto 0 0;background:var(--diag);border-radius:3px;z-index:0}}
.cell b{{position:relative;z-index:1}} .diag{{background:var(--diag);font-weight:600}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}} .cm{{max-width:420px}}
.kpi{{display:flex;gap:24px;flex-wrap:wrap}} .kpi div b{{display:block;font-size:22px;color:var(--accent)}}
</style></head><body><main>
<h1>Benchmark chấm điểm CV</h1>
<p class=muted>Bộ dữ liệu cnamuangtoun/resume-job-description-fit · test {s['pairs']['test']} cặp, calib {s['pairs']['calib']} cặp (chia đều 3 nhãn) ·
sinh lúc {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>

<div class=card><div class=kpi>
<div><span class=muted>Ngưỡng đang dùng</span><b>{cur['potential_min']:g} / {cur['good_min']:g}</b></div>
<div><span class=muted>Ngưỡng đề xuất (Gemini, tiếng Việt, calib)</span><b>{f"{rec['potential_min']:g} / {rec['good_min']:g}" if rec else "—"}</b></div>
</div><p class=muted>Ngưỡng = điểm tối thiểu để xếp "Tiềm năng" / "Phù hợp tốt", chọn trên tập calib để tối đa macro-F1; mọi chỉ số bên dưới tính trên tập test.</p></div>

<h2>Kết quả trên tập test</h2><div class=card>{results_table(s['results'])}
<p class=muted>Macro-F1 = trung bình F1 của 3 nhãn (chỉ số chính, không thiên về nhãn nhiều). QWK = độ đồng thuận có tính thứ tự (0 = ngẫu nhiên, 1 = hoàn hảo).
CI 95% từ bootstrap 1000 lần.</p></div>

<h2>Ma trận nhầm lẫn (AI, ngưỡng hiệu chỉnh)</h2><div class=grid>{''.join(confusion_block(k, r) for k, r in ai) or '<p class=muted>Chưa có kết quả AI.</p>'}</div>

<h2>So sánh cặp</h2><div class=card>{comparisons_table(s['comparisons'])}</div>

<h2>Độ ổn định (Gemini, tiếng Việt — chấm lặp cùng input)</h2><div class=card>{
    "<table><thead><tr><th>Lượt</th><th>Cặp</th><th>Lệch điểm TB</th><th>Lệch tối đa</th><th>Cùng xếp loại</th><th>Cùng mọi mức</th></tr></thead><tbody>" + stab_rows + "</tbody></table>"
    if stab_rows else "<p class=muted>Chưa có lượt chấm lặp.</p>"}</div>

<h2>Trích xuất CV</h2><div class=card>{
    "<table><thead><tr><th>Cấu hình</th><th>CV</th><th>Lỗi</th><th>Thời gian trung vị (s)</th></tr></thead><tbody>" + ext_rows + "</tbody></table>"
    if ext_rows else "<p class=muted>Chưa có kết quả trích xuất.</p>"}</div>
</main></body></html>"""
    out = RESULTS_DIR / "report.html"
    out.write_text(page, encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
