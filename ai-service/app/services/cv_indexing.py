"""
Lập chỉ mục tìm kiếm vector cho CV (bảng `cv_document_chunks` + `candidate_search_profile`).

Luồng: dữ kiện CV (`cv_facts.result`, dạng CVFacts) → dựng các đoạn văn bản → embed → lưu.
- Văn bản embed dựng từ các câu trích của CV ĐÃ che thông tin cá nhân: vector chỉ mô tả năng lực,
  dữ liệu cá nhân không rời hệ thống. Tên/email/SĐT chỉ có dạng băm (`cv_facts.text_metadata.identity`).
- Số năm kinh nghiệm và danh sách kỹ năng (để lọc) được suy ra từ câu trích, không phải trường có cấu trúc.
- Idempotent: cùng (candidate_id, file_hash, model) đã có thì bỏ qua; CV mới thay thế hoàn toàn đoạn cũ của ứng viên.
- Best-effort ở nơi gọi: lập chỉ mục lỗi KHÔNG được làm hỏng chấm điểm CV (xem `schedule_indexing`).
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.vector_schema import vector_enabled
from app.models import (
    AIScore, CandidateSearchProfile, CVDocumentChunk, CVFactsRecord, DuplicateCandidate,
)
from app.services import duplicates
from app.services.embeddings import Embedder, EmbeddingError, embed_documents, get_embedder

logger = logging.getLogger(__name__)

MAX_CHUNK_CHARS = 2000
MAX_DOC_CHARS = 4000
MAX_ENTRIES_PER_TYPE = 12

SUMMARY = "SUMMARY"
SKILLS = "SKILLS"
WORK_EXPERIENCE = "WORK_EXPERIENCE"
PROJECT = "PROJECT"
EDUCATION = "EDUCATION"
CERTIFICATION = "CERTIFICATION"


@dataclass
class CVChunk:
    chunk_type: str
    content: str


@dataclass
class CVProfile:
    """Kết quả dựng từ một CV: các đoạn + văn bản cả hồ sơ + trường để lọc SQL."""
    chunks: list[CVChunk]
    doc_text: str
    skills: list[str]
    titles: list[str]
    total_years: float | None
    # Dùng phát hiện trùng (đã chuẩn hoá): tên, băm email, băm SĐT.
    name_norm: str | None = None
    email_hash: str | None = None
    phone_hash: str | None = None


def _clip(text: str, limit: int = MAX_CHUNK_CHARS) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit].rstrip()


def _join(parts: list, sep: str = ". ") -> str:
    return sep.join(p.strip() for p in parts if isinstance(p, str) and p.strip())


def _dedupe(items: list) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if not isinstance(item, str):
            continue
        key = item.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(item.strip())
    return out


_MONTH_YEAR = r"(?:(\d{1,2})\s*[/.\-]\s*)?((?:19|20)\d{2})"
_PRESENT = r"(?:nay|hiện tại|hiện nay|present|now|current|đến nay)"
_RANGE = re.compile(rf"{_MONTH_YEAR}\s*(?:-|–|—|đến|to)\s*(?:{_MONTH_YEAR}|({_PRESENT}))", re.IGNORECASE)
_SKILL_SPLIT = re.compile(r"[,;•·|\n]|\s-\s")


def _month_index(month: str | None, year: str, *, end: bool) -> int:
    m = int(month) if month and 1 <= int(month) <= 12 else (12 if end else 1)
    return int(year) * 12 + m


def estimate_years(work_quotes: list[str], today: datetime | None = None) -> float | None:
    """Số năm kinh nghiệm ước lượng = hợp các khoảng thời gian (tháng/năm – tháng/năm|nay) trong câu trích công việc.
    Không có khoảng nào đọc được → None (bộ lọc số năm sẽ loại hồ sơ này, giống trường hợp chưa rõ số năm)."""
    today = today or datetime.utcnow()
    now_idx = today.year * 12 + today.month
    spans: list[tuple[int, int]] = []
    for q in work_quotes:
        for m in _RANGE.finditer(q):
            sm, sy, em, ey, present = m.groups()
            start = _month_index(sm, sy, end=False)
            end = now_idx if present else _month_index(em, ey, end=True) if ey else None
            if end is None or end < start or end > now_idx + 1:
                continue
            spans.append((start, end))
    if not spans:
        return None
    spans.sort()
    total, cur_s, cur_e = 0, spans[0][0], spans[0][1]
    for s_, e_ in spans[1:]:
        if s_ > cur_e:
            total += cur_e - cur_s + 1
            cur_s, cur_e = s_, e_
        else:
            cur_e = max(cur_e, e_)
    total += cur_e - cur_s + 1
    return round(total / 12, 1)


def _skills_from_quotes(quotes: list[str]) -> list[str]:
    out: list[str] = []
    for q in quotes:
        body = q.split(":", 1)[1] if ":" in q[:40] else q  # bỏ nhãn "Ngôn ngữ:", "Công cụ:"
        out.extend(x.strip(" .*") for x in _SKILL_SPLIT.split(body))
    return [x for x in _dedupe(out) if 1 < len(x) <= 40][:60]


def build_cv_profile(facts: dict, identity: dict | None = None) -> CVProfile:
    """Dựng đoạn văn bản từ `CVFacts` (dạng dict/JSONB): mỗi dữ kiện một câu trích. `identity` là
    {name_norm, email_hash, phone_hash} lấy từ cv_facts.text_metadata (đã băm)."""
    by_cat: dict[str, list[str]] = {}
    for f in facts.get("facts") or []:
        quote = " ".join(str(f.get("quote") or "").split())
        if quote:
            by_cat.setdefault(f.get("category") or "", []).append(quote)

    work = by_cat.get("WORK_EXPERIENCE", [])[:MAX_ENTRIES_PER_TYPE]
    skills = _skills_from_quotes(by_cat.get("SKILLS", []))
    years = estimate_years(work)

    chunks: list[CVChunk] = []
    summary = _join([
        f"Tổng kinh nghiệm: {years:g} năm" if years is not None else None,
        f"Kỹ năng chính: {', '.join(skills[:20])}" if skills else None,
        work[0] if work else None,
    ])
    if summary:
        chunks.append(CVChunk(SUMMARY, _clip(summary)))
    if by_cat.get("SKILLS"):
        chunks.append(CVChunk(SKILLS, _clip("Kỹ năng: " + "; ".join(by_cat["SKILLS"]))))
    for cat, kind in (("WORK_EXPERIENCE", WORK_EXPERIENCE), ("PROJECT", PROJECT),
                      ("EDUCATION", EDUCATION), ("CERTIFICATIONS", CERTIFICATION)):
        for q in by_cat.get(cat, [])[:MAX_ENTRIES_PER_TYPE]:
            chunks.append(CVChunk(kind, _clip(q)))

    doc_text = _clip(" \n".join(c.content for c in chunks), MAX_DOC_CHARS)
    ident = identity or {}
    return CVProfile(
        chunks=chunks, doc_text=doc_text, skills=skills, titles=[], total_years=years,
        name_norm=ident.get("name_norm"), email_hash=ident.get("email_hash"), phone_hash=ident.get("phone_hash"),
    )


# Khoá theo ứng viên: sự kiện cv.uploaded và lượt chấm điểm có thể lập chỉ mục CÙNG một ứng viên cùng lúc; nếu cả hai
# cùng "xoá đoạn cũ rồi thêm đoạn mới" trong hai giao dịch riêng thì đoạn bị nhân đôi. Khoá khiến lượt đến sau chờ,
# rồi thấy file_hash đã được lập chỉ mục và bỏ qua (không embed lại). ai-service chạy một tiến trình nên khoá trong
# bộ nhớ là đủ.
_index_locks: dict[int, asyncio.Lock] = {}


async def index_candidate_cv(
    session_factory: async_sessionmaker[AsyncSession],
    candidate_id: int,
    file_hash: str,
    result: dict,
    *,
    identity: dict | None = None,
    embedder: Embedder | None = None,
    force: bool = False,
) -> bool:
    """Embed và lưu CV của ứng viên (tuần tự theo từng ứng viên). Xem `_index_candidate_cv_locked`."""
    # Mỗi ứng viên một Lock nhỏ, giữ lại (không xoá) để tránh tạo khoá thứ hai khi còn tác vụ đang chờ.
    async with _index_locks.setdefault(candidate_id, asyncio.Lock()):
        return await _index_candidate_cv_locked(
            session_factory, candidate_id, file_hash, result, identity=identity, embedder=embedder, force=force)


async def _index_candidate_cv_locked(
    session_factory: async_sessionmaker[AsyncSession],
    candidate_id: int,
    file_hash: str,
    result: dict,
    *,
    identity: dict | None = None,
    embedder: Embedder | None = None,
    force: bool = False,
) -> bool:
    """Embed và lưu CV của ứng viên. Trả True nếu đã ghi mới, False nếu bỏ qua (đã có / không có nội dung / tắt vector).

    Raises:
        EmbeddingError: không tạo được embedding.
    """
    if not vector_enabled():
        return False
    embedder = embedder or get_embedder()

    async with session_factory() as session:
        if not force:
            current = await session.get(CandidateSearchProfile, candidate_id)
            if current and current.latest_file_hash == file_hash and current.model == embedder.model_name:
                # Đã embed rồi. Hồ sơ lập chỉ mục trước khi có phát hiện trùng thì chưa có tên/băm email/SĐT:
                # bổ sung nhẹ (không embed lại, không gọi Gemini) rồi kiểm tra trùng.
                if current.name_norm is None and current.email_hash is None and current.phone_hash is None:
                    ident = build_cv_profile(result, identity)
                    current.name_norm, current.email_hash, current.phone_hash = (
                        ident.name_norm, ident.email_hash, ident.phone_hash)
                    await session.commit()
                    await _flag_duplicates(session_factory, candidate_id)
                return False

    profile = build_cv_profile(result, identity)
    if not profile.chunks:
        return False

    # MỘT lời gọi embed cho mọi đoạn + văn bản cả hồ sơ (đoạn cuối).
    vectors = await embed_documents([c.content for c in profile.chunks] + [profile.doc_text], embedder)
    chunk_vectors, doc_vector = vectors[:-1], vectors[-1]

    async with session_factory() as session:
        # CV mới thay thế hoàn toàn đoạn cũ của ứng viên (cùng một giao dịch → không có lúc "mất dữ liệu").
        await session.execute(delete(CVDocumentChunk).where(CVDocumentChunk.candidate_id == candidate_id))
        session.add_all([
            CVDocumentChunk(candidate_id=candidate_id, file_hash=file_hash, chunk_type=c.chunk_type,
                            content=c.content, embedding=v, model=embedder.model_name)
            for c, v in zip(profile.chunks, chunk_vectors)
        ])
        values = {
            "candidate_id": candidate_id, "latest_file_hash": file_hash, "total_years": profile.total_years,
            "skills": profile.skills, "titles": profile.titles, "doc_embedding": doc_vector,
            "model": embedder.model_name, "updated_at": datetime.utcnow(),
            "name_norm": profile.name_norm, "email_hash": profile.email_hash, "phone_hash": profile.phone_hash,
        }
        stmt = insert(CandidateSearchProfile).values(**values)
        stmt = stmt.on_conflict_do_update(
            index_elements=["candidate_id"], set_={k: stmt.excluded[k] for k in values if k != "candidate_id"})
        await session.execute(stmt)
        await session.commit()

    await _flag_duplicates(session_factory, candidate_id)
    return True


async def _flag_duplicates(session_factory: async_sessionmaker[AsyncSession], candidate_id: int) -> None:
    """Tìm và ghi các cặp nghi trùng cho ứng viên vừa lập chỉ mục. Lỗi chỉ ghi log, không ảnh hưởng chỉ mục."""
    try:
        async with session_factory() as session:
            matches = await duplicates.find_duplicates(session, candidate_id)
            if matches:
                await duplicates.record_duplicates(session, candidate_id, matches)
                logger.info("Ứng viên %s nghi trùng với %s", candidate_id,
                            [(m.other_id, m.signals) for m in matches])
    except Exception:  # noqa: BLE001
        logger.exception("Không kiểm tra được ứng viên trùng cho %s", candidate_id)


# --- Chạy nền, best-effort ------------------------------------------------------------------

_background: set[asyncio.Task] = set()


async def _safe_index(session_factory, candidate_id: int, file_hash: str, result: dict, identity: dict | None) -> None:
    try:
        await index_candidate_cv(session_factory, candidate_id, file_hash, result, identity=identity)
    except EmbeddingError as exc:
        logger.warning("Không lập chỉ mục CV của ứng viên %s: %s", candidate_id, exc)
    except Exception:  # noqa: BLE001
        logger.exception("Lỗi lập chỉ mục CV của ứng viên %s", candidate_id)


def schedule_indexing(session_factory, candidate_id: int | None, extraction: CVFactsRecord) -> None:
    """Lập chỉ mục nền sau khi trích xuất xong; không chặn, không ném lỗi. Giữ tham chiếu task."""
    if candidate_id is None or not extraction.result or not vector_enabled():
        return
    identity = (extraction.text_metadata or {}).get("identity")
    task = asyncio.create_task(
        _safe_index(session_factory, candidate_id, extraction.file_hash, extraction.result, identity))
    _background.add(task)
    task.add_done_callback(_background.discard)


async def delete_vector_data(session_factory: async_sessionmaker[AsyncSession], candidate_id: int) -> dict:
    """Xoá dữ liệu tìm kiếm vector của ứng viên: embedding các đoạn CV, hồ sơ tìm kiếm, cặp nghi trùng."""
    counts: dict[str, int] = {}
    if not vector_enabled():
        return counts
    async with session_factory() as session:
        r1 = await session.execute(delete(CVDocumentChunk).where(CVDocumentChunk.candidate_id == candidate_id))
        r2 = await session.execute(
            delete(CandidateSearchProfile).where(CandidateSearchProfile.candidate_id == candidate_id))
        counts["chunks"], counts["profiles"] = r1.rowcount, r2.rowcount
        r3 = await session.execute(delete(DuplicateCandidate).where(
            or_(DuplicateCandidate.candidate_a == candidate_id, DuplicateCandidate.candidate_b == candidate_id)))
        counts["duplicates"] = r3.rowcount
        await session.commit()
    return counts


async def delete_candidate_data(session_factory: async_sessionmaker[AsyncSession], candidate_id: int) -> dict:
    """Xoá mọi dữ liệu AI phái sinh của ứng viên (GDPR): dữ liệu vector, kết quả trích xuất CV và phần chi tiết của
    điểm chấm. Điểm và xếp loại được giữ để số liệu thống kê không đổi (cùng chính sách với purge_candidate_data)."""
    counts = await delete_vector_data(session_factory, candidate_id)
    async with session_factory() as session:
        await session.execute(
            update(AIScore).where(AIScore.candidate_id == candidate_id)
            .values(cv_facts_id=None, result=None, provenance=None, error_message=None))
        r = await session.execute(delete(CVFactsRecord).where(CVFactsRecord.candidate_id == candidate_id))
        counts["extractions"] = r.rowcount
        await session.commit()
    return counts


async def backfill(session_factory: async_sessionmaker[AsyncSession], *, force: bool = False) -> dict:
    """Lập chỉ mục mọi CV đã trích xuất thành công (CV mới nhất của mỗi ứng viên). Chạy nền do API gọi."""
    stats = {"indexed": 0, "skipped": 0, "failed": 0}
    async with session_factory() as session:
        rows = (await session.execute(
            select(CVFactsRecord.candidate_id, CVFactsRecord.file_hash, CVFactsRecord.result,
                   CVFactsRecord.text_metadata)
            .where(CVFactsRecord.status == "COMPLETED", CVFactsRecord.candidate_id.is_not(None),
                   CVFactsRecord.result.is_not(None))
            .order_by(CVFactsRecord.candidate_id, CVFactsRecord.updated_at.desc())
        )).all()
    latest: dict[int, tuple[str, dict, dict | None]] = {}
    for candidate_id, file_hash, result, meta in rows:
        latest.setdefault(candidate_id, (file_hash, result, (meta or {}).get("identity")))  # bản mới nhất đứng đầu mỗi ứng viên
    for candidate_id, (file_hash, result, identity) in latest.items():
        try:
            if await index_candidate_cv(session_factory, candidate_id, file_hash, result,
                                        identity=identity, force=force):
                stats["indexed"] += 1
            else:
                stats["skipped"] += 1
        except Exception as exc:  # noqa: BLE001
            stats["failed"] += 1
            logger.warning("Backfill lỗi ở ứng viên %s: %s", candidate_id, exc)
    logger.info("Backfill chỉ mục CV xong: %s", stats)
    return stats
