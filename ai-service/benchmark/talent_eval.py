"""Đo độ chính xác lọc kỹ năng và số năm của Talent Pool, so chỉ mục cũ (snapshot) với chỉ mục hiện tại.

Chuẩn đối chiếu KHÔNG dùng danh mục kỹ năng của hệ thống (để không tự chấm chính mình): với mỗi kỹ năng, "đáp án" là
các CV có văn bản GỐC chứa tên kỹ năng theo một biểu thức chính quy viết tay riêng bên dưới.

Cách chạy (cần DB + S3 + .env như ai-service):
    .venv/Scripts/python.exe benchmark/talent_eval.py snapshot tmp/talent/baseline.json   # lưu chỉ mục hiện có
    # ... lập chỉ mục lại (POST /embeddings/backfill?force=true) ...
    .venv/Scripts/python.exe benchmark/talent_eval.py compare tmp/talent/baseline.json    # so cũ với mới
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.database import async_session_factory  # noqa: E402
from app.models import CandidateSearchProfile, CVFactsRecord  # noqa: E402
from app.services.extraction_pipeline import extract_text_from_bytes  # noqa: E402
from app.services.facts_store import _download  # noqa: E402
from app.services.talent_search import skill_matches  # noqa: E402

# kỹ năng cần kiểm → biểu thức khớp trên văn bản gốc (viết tay, độc lập với skill_catalog)
TRUTH = {
    "Spring Boot": r"spring[\s\-]?boot",
    "Java": r"(?<![a-z])java(?![a-z])",
    "Kafka": r"kafka",
    "PostgreSQL": r"postgre(?:sql)?|psql",
    "Docker": r"docker",
    "Kubernetes": r"kubernetes|k8s",
    "Redis": r"redis",
    "React": r"react(?:\.?js)?(?![a-z])",
    "Node.js": r"node\.?js",
    "MySQL": r"mysql",
    "AWS": r"(?<![a-z])aws(?![a-z])|amazon web services",
    "Python": r"python",
    "C#": r"c#",
    ".NET": r"\.net|dotnet",
    "MongoDB": r"mongo",
    "RabbitMQ": r"rabbitmq",
    "Microservices": r"micro[\s\-]?service",
    "CI/CD": r"ci\s*/\s*cd|jenkins|gitlab[\s\-]?ci|github actions",
}


async def raw_texts(cache: Path) -> dict[int, str]:
    if cache.exists():
        return {int(k): v for k, v in json.loads(cache.read_text(encoding="utf-8")).items()}
    # Danh sách {id: url CV}: file `urls.json` cạnh snapshot (lấy từ candidate-service); không có thì dùng cv_facts (thiếu).
    urls = cache.parent / "urls.json"
    latest: dict[int, str] = {int(k): v for k, v in json.loads(urls.read_text(encoding="utf-8")).items()} if urls.exists() else {}
    if not latest:
        async with async_session_factory() as session:
            rows = (await session.execute(
                select(CVFactsRecord.candidate_id, CVFactsRecord.resume_url)
                .where(CVFactsRecord.candidate_id.is_not(None), CVFactsRecord.resume_url.is_not(None))
                .order_by(CVFactsRecord.candidate_id, CVFactsRecord.updated_at.desc()))).all()
        for cid, url in rows:
            latest.setdefault(cid, url)
    out: dict[int, str] = {}
    for cid, url in latest.items():
        data, name = await _download(url)
        t = await extract_text_from_bytes(data, name)
        if t.status == "success":
            out[cid] = t.text
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    return out


async def current_index() -> dict[int, dict]:
    async with async_session_factory() as session:
        rows = (await session.execute(select(
            CandidateSearchProfile.candidate_id, CandidateSearchProfile.total_years, CandidateSearchProfile.skills,
            CandidateSearchProfile.titles, CandidateSearchProfile.search_text))).all()
    return {r.candidate_id: {"years": float(r.total_years) if r.total_years is not None else None,
                             "skills": list(r.skills or []), "titles": list(r.titles or []),
                             "text": r.search_text or ""} for r in rows}


def prf(found: set[int], truth: set[int]) -> tuple[float, float, float]:
    tp = len(found & truth)
    p = tp / len(found) if found else (1.0 if not truth else 0.0)
    r = tp / len(truth) if truth else 1.0
    f = 2 * p * r / (p + r) if p + r else 0.0
    return p, r, f


def score(index: dict[int, dict], texts: dict[int, str], *, use_text: bool) -> dict[str, tuple[float, float, float, int]]:
    from app.services.talent_search import _has_word, skill_catalog, skill_catalog as sc  # noqa: F401
    out = {}
    for skill, pattern in TRUTH.items():
        truth = {c for c, t in texts.items() if re.search(pattern, t, re.I)}
        found = set()
        for cid, p in index.items():
            if cid not in texts:
                continue
            hit = skill_matches(skill, p["skills"])
            if not hit and use_text and p.get("text"):
                hit = any(_has_word(p["text"], v) for v in sc.variants(skill))
            if hit:
                found.add(cid)
        out[skill] = (*prf(found, truth), len(truth))
    return out


async def main() -> None:
    mode, path = sys.argv[1], Path(sys.argv[2])
    if mode == "snapshot":
        idx = await current_index()
        path.write_text(json.dumps({str(k): {x: y for x, y in v.items() if x != "text"} for k, v in idx.items()},
                                   ensure_ascii=False), encoding="utf-8")
        print(f"đã lưu {len(idx)} hồ sơ vào {path}")
        return
    texts = await raw_texts(path.parent / "raw_texts.json")
    old_raw = json.loads(path.read_text(encoding="utf-8"))
    old = {int(r["id"]): r for r in old_raw} if isinstance(old_raw, list) else {int(k): v for k, v in old_raw.items()}
    new = await current_index()
    a, b = score(old, texts, use_text=False), score(new, texts, use_text=True)
    print(f"{len(texts)} CV có văn bản gốc; cũ={len(old)} hồ sơ, mới={len(new)} hồ sơ\n")
    print(f"{'Kỹ năng':16}{'đáp án':>7} | {'CŨ P':>6}{'R':>6}{'F1':>6} | {'MỚI P':>6}{'R':>6}{'F1':>6}")
    mean_a = [0.0, 0.0, 0.0]
    mean_b = [0.0, 0.0, 0.0]
    for skill in TRUTH:
        (pa, ra, fa, n), (pb, rb, fb, _) = a[skill], b[skill]
        print(f"{skill:16}{n:>7} | {pa:6.2f}{ra:6.2f}{fa:6.2f} | {pb:6.2f}{rb:6.2f}{fb:6.2f}")
        for i, v in enumerate((pa, ra, fa)):
            mean_a[i] += v / len(TRUTH)
        for i, v in enumerate((pb, rb, fb)):
            mean_b[i] += v / len(TRUTH)
    print(f"{'TRUNG BÌNH':16}{'':>7} | {mean_a[0]:6.2f}{mean_a[1]:6.2f}{mean_a[2]:6.2f} | {mean_b[0]:6.2f}{mean_b[1]:6.2f}{mean_b[2]:6.2f}")
    ya = sum(1 for v in old.values() if v.get("years") is not None)
    yb = sum(1 for v in new.values() if v["years"] is not None)
    ta = sum(1 for v in old.values() if v.get("titles"))
    tb = sum(1 for v in new.values() if v["titles"])
    print(f"\nCó số năm kinh nghiệm: cũ {ya}/{len(old)} → mới {yb}/{len(new)}")
    print(f"Có chức danh:          cũ {ta}/{len(old)} → mới {tb}/{len(new)}")


if __name__ == "__main__":
    asyncio.run(main())
