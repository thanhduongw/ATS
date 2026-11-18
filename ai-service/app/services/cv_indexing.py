"""
Lập chỉ mục Talent Pool cho CV (bảng `cv_document_chunks` + `candidate_search_profile`).

Luồng: file CV → văn bản → CHE thông tin cá nhân → hồ sơ Talent Pool (`talent_profile`: kỹ năng theo danh mục, chức danh,
từng công việc có ngày, số năm, tóm tắt) → chia đoạn theo mục CV → embed → lưu.
- KHÔNG đọc và KHÔNG ghi `cv_facts`: dữ kiện chấm điểm của người khác phụ trách giữ nguyên. Chỉ mượn `cv_facts`
  làm danh sách "ứng viên nào, file CV nào" khi backfill (đọc), và `resume_url`/`file_hash` khi được báo sau chấm điểm.
- Văn bản embed là CV đã che thông tin cá nhân: vector chỉ mô tả năng lực. Tên/email/SĐT chỉ lưu dạng băm.
- Idempotent: cùng (candidate_id, file_hash, model, phiên bản hồ sơ) đã có (và hồ sơ do AI trích) thì bỏ qua;
  CV mới thay thế hoàn toàn đoạn cũ của ứng viên.
- Best-effort ở nơi gọi: lập chỉ mục lỗi KHÔNG được làm hỏng chấm điểm CV (xem `schedule_indexing`).
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.llm_client import LLMManager
from app.core.vector_schema import vector_enabled
from app.models import (
    AIScore, CandidateSearchProfile, CVDocumentChunk, CVFactsRecord, DuplicateCandidate,
)
from app.services import duplicates, skill_catalog
from app.services.embeddings import Embedder, EmbeddingError, embed_documents, get_embedder
from app.services.extraction_pipeline import extract_text_from_bytes
from app.services.privacy import contact_identity, redact_for_talent
from app.services.talent_profile import (
    PROFILE_VERSION, TalentProfile, build_profile, split_sections,
)

logger = logging.getLogger(__name__)

MAX_DOC_CHARS = 4000
MAX_CHUNKS = 30
MAX_SEARCH_TEXT = 12000

SUMMARY = "SUMMARY"
SKILLS = "SKILLS"
WORK_EXPERIENCE = "WORK_EXPERIENCE"
PROJECT = "PROJECT"
EDUCATION = "EDUCATION"
CERTIFICATION = "CERTIFICATION"
OTHER = "OTHER"

_SECTION_TYPE = (
    (("KINH NGHIỆM", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "EXPERIENCE"), WORK_EXPERIENCE),
    (("HỌC VẤN", "EDUCATION"), EDUCATION),
    (("KỸ NĂNG", "SKILL", "TECHNICAL SKILLS"), SKILLS),
    (("DỰ ÁN", "PROJECT"), PROJECT),
    (("CHỨNG CHỈ", "CERTIFICATION"), CERTIFICATION),
)


def _chunk_type(section: str) -> str:
    for names, kind in _SECTION_TYPE:
        if any(section.startswith(n) for n in names):
            return kind
    return OTHER


@dataclass
class CVChunk:
    chunk_type: str
    content: str


@dataclass
class CVSource:
    """Văn bản CV đã che thông tin cá nhân + danh tính đã băm (chỉ để phát hiện trùng)."""
    file_hash: str
    text: str
    identity: dict


@dataclass
class CVIndex:
    """Kết quả dựng từ một CV: các đoạn + văn bản cả hồ sơ + trường để lọc SQL."""
    chunks: list[CVChunk]
    doc_text: str
    search_text: str
    profile: TalentProfile
    identity: dict


def _clip(text: str, limit: int) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit].rstrip()


def summary_text(profile: TalentProfile) -> str:
    parts = [
        f"Tổng kinh nghiệm: {profile.total_years:g} năm" if profile.total_years is not None else None,
        f"Chức danh: {', '.join(profile.titles[:5])}" if profile.titles else None,
        f"Kỹ năng chính: {', '.join(profile.skills[:25])}" if profile.skills else None,
        f"Lĩnh vực: {', '.join(profile.domains)}" if profile.domains else None,
        profile.summary or None,
    ]
    return ". ".join(p for p in parts if p)


def build_index(source: CVSource, profile: TalentProfile) -> CVIndex:
    """Dựng đoạn + văn bản tìm kiếm từ văn bản CV đã che và hồ sơ Talent Pool."""
    chunks: list[CVChunk] = []
    summary = summary_text(profile)
    if summary:
        chunks.append(CVChunk(SUMMARY, _clip(summary, 1500)))
    for name, content in split_sections(source.text):
        if len(chunks) >= MAX_CHUNKS:
            break
        chunks.append(CVChunk(_chunk_type(name), content))
    doc_text = _clip(" ".join(c.content for c in chunks), MAX_DOC_CHARS)
    search_text = skill_catalog.fold(" ".join([summary, source.text]))[:MAX_SEARCH_TEXT]
    return CVIndex(chunks=chunks, doc_text=doc_text, search_text=search_text, profile=profile, identity=source.identity)


async def load_cv(resume_url: str, cv_bytes: bytes | None = None) -> CVSource | None:
    """Tải file CV → đọc chữ → che thông tin cá nhân. None nếu không đọc được. Raises CVUnavailableError nếu không tải được."""
    from app.services.facts_store import _download, file_sha256
    filename = resume_url.rsplit("/", 1)[-1]
    if cv_bytes is None:
        cv_bytes, filename = await _download(resume_url)
    text = await extract_text_from_bytes(cv_bytes, filename)
    if text.status != "success" or not text.text:
        logger.warning("Talent Pool: không đọc được nội dung CV %s: %s", resume_url, text.metadata.error_message)
        return None
    return CVSource(
        file_hash=file_sha256(cv_bytes), text=redact_for_talent(text.text),
        # Giá trị thô không rời hàm này: chỉ giữ bản băm/chuẩn hoá để phát hiện ứng viên trùng.
        identity=duplicates.identity_hashes(contact_identity(text.text)))


# Khoá theo ứng viên: sự kiện cv.uploaded và lượt chấm điểm có thể lập chỉ mục CÙNG một ứng viên cùng lúc; nếu cả hai
# cùng "xoá đoạn cũ rồi thêm đoạn mới" trong hai giao dịch riêng thì đoạn bị nhân đôi. Khoá khiến lượt đến sau chờ,
# rồi thấy file_hash đã được lập chỉ mục và bỏ qua (không embed lại). ai-service chạy một tiến trình nên khoá trong
# bộ nhớ là đủ.
_index_locks: dict[int, asyncio.Lock] = {}


async def index_candidate_cv(
    session_factory: async_sessionmaker[AsyncSession],
    candidate_id: int,
    resume_url: str,
    *,
    file_hash: str | None = None,
    cv_bytes: bytes | None = None,
    embedder: Embedder | None = None,
    manager: LLMManager | None = None,
    force: bool = False,
) -> bool:
    """Lập chỉ mục CV của ứng viên (tuần tự theo từng ứng viên). Xem `_index_candidate_cv_locked`."""
    # Mỗi ứng viên một Lock nhỏ, giữ lại (không xoá) để tránh tạo khoá thứ hai khi còn tác vụ đang chờ.
    async with _index_locks.setdefault(candidate_id, asyncio.Lock()):
        return await _index_candidate_cv_locked(
            session_factory, candidate_id, resume_url, file_hash=file_hash, cv_bytes=cv_bytes,
            embedder=embedder, manager=manager, force=force)


def _up_to_date(current: CandidateSearchProfile | None, file_hash: str | None, model: str) -> bool:
    """Đã lập chỉ mục đúng file này, đúng model, đúng phiên bản hồ sơ và hồ sơ do AI trích (lần trước AI lỗi thì thử lại)."""
    if current is None or file_hash is None:
        return False
    return (current.latest_file_hash == file_hash and current.model == model
            and current.profile_version == PROFILE_VERSION and (current.profile or {}).get("source") == "llm")


async def _index_candidate_cv_locked(
    session_factory: async_sessionmaker[AsyncSession],
    candidate_id: int,
    resume_url: str,
    *,
    file_hash: str | None = None,
    cv_bytes: bytes | None = None,
    embedder: Embedder | None = None,
    manager: LLMManager | None = None,
    force: bool = False,
) -> bool:
    """Lập chỉ mục CV. Trả True nếu đã ghi mới, False nếu bỏ qua (đã có / không đọc được / tắt vector).

    Raises:
        EmbeddingError: không tạo được embedding.
        CVUnavailableError: không tải được file CV.
    """
    if not vector_enabled():
        return False
    embedder = embedder or get_embedder()

    async with session_factory() as session:
        current = await session.get(CandidateSearchProfile, candidate_id)
    if not force and _up_to_date(current, file_hash, embedder.model_name):
        return False

    source = await load_cv(resume_url, cv_bytes)
    if source is None:
        return False
    if not force and _up_to_date(current, source.file_hash, embedder.model_name):
        return False

    profile = await build_profile(source.text, manager)
    index = build_index(source, profile)
    if not index.chunks:
        return False

    # MỘT lời gọi embed cho mọi đoạn + văn bản cả hồ sơ (đoạn cuối).
    vectors = await embed_documents([c.content for c in index.chunks] + [index.doc_text], embedder)
    chunk_vectors, doc_vector = vectors[:-1], vectors[-1]

    async with session_factory() as session:
        # CV mới thay thế hoàn toàn đoạn cũ của ứng viên (cùng một giao dịch → không có lúc "mất dữ liệu").
        await session.execute(delete(CVDocumentChunk).where(CVDocumentChunk.candidate_id == candidate_id))
        session.add_all([
            CVDocumentChunk(candidate_id=candidate_id, file_hash=source.file_hash, chunk_type=c.chunk_type,
                            content=c.content, embedding=v, model=embedder.model_name)
            for c, v in zip(index.chunks, chunk_vectors)
        ])
        values = {
            "candidate_id": candidate_id, "latest_file_hash": source.file_hash, "total_years": profile.total_years,
            "skills": profile.skills, "titles": profile.titles, "doc_embedding": doc_vector,
            "model": embedder.model_name, "updated_at": datetime.utcnow(),
            "profile": profile.as_json(), "profile_version": PROFILE_VERSION, "search_text": index.search_text,
            "name_norm": source.identity.get("name_norm"), "email_hash": source.identity.get("email_hash"),
            "phone_hash": source.identity.get("phone_hash"),
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


async def _safe_index(session_factory, candidate_id: int, resume_url: str, file_hash: str | None) -> None:
    try:
        await index_candidate_cv(session_factory, candidate_id, resume_url, file_hash=file_hash)
    except EmbeddingError as exc:
        logger.warning("Không lập chỉ mục CV của ứng viên %s: %s", candidate_id, exc)
    except Exception:  # noqa: BLE001
        logger.exception("Lỗi lập chỉ mục CV của ứng viên %s", candidate_id)


def schedule_indexing(session_factory, candidate_id: int | None, extraction: CVFactsRecord) -> None:
    """Lập chỉ mục nền sau khi chấm điểm đã có CV; không chặn, không ném lỗi. Chỉ ĐỌC `resume_url`/`file_hash`
    của dữ kiện CV (không dùng nội dung dữ kiện). Giữ tham chiếu task."""
    if candidate_id is None or not extraction.resume_url or not vector_enabled():
        return
    task = asyncio.create_task(_safe_index(session_factory, candidate_id, extraction.resume_url, extraction.file_hash))
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


async def backfill(
    session_factory: async_sessionmaker[AsyncSession], *, force: bool = False, parallel: int = 3,
    manager: LLMManager | None = None, extra_sources: dict[int, str] | None = None,
) -> dict:
    """Lập chỉ mục CV của mọi ứng viên đã có file CV được hệ thống ghi nhận (CV mới nhất của mỗi ứng viên).
    Chạy nền do API gọi. `cv_facts` chỉ được ĐỌC để biết ứng viên nào dùng file nào."""
    stats = {"indexed": 0, "skipped": 0, "failed": 0}
    async with session_factory() as session:
        rows = (await session.execute(
            select(CVFactsRecord.candidate_id, CVFactsRecord.resume_url, CVFactsRecord.file_hash)
            .where(CVFactsRecord.candidate_id.is_not(None), CVFactsRecord.resume_url.is_not(None))
            .order_by(CVFactsRecord.candidate_id, CVFactsRecord.updated_at.desc())
        )).all()
    latest: dict[int, tuple[str, str]] = {}
    for candidate_id, resume_url, file_hash in rows:
        latest.setdefault(candidate_id, (resume_url, file_hash))  # bản mới nhất đứng đầu mỗi ứng viên
    # Ứng viên chưa có dòng nào trong cv_facts (chưa từng được chấm theo cách hiện tại) nhưng có CV ở candidate-service.
    for candidate_id, resume_url in (extra_sources or {}).items():
        if candidate_id not in latest and resume_url:
            latest[candidate_id] = (resume_url, None)
    gate = asyncio.Semaphore(max(1, parallel))

    async def one(candidate_id: int, resume_url: str, file_hash: str | None) -> None:
        async with gate:
            try:
                done = await index_candidate_cv(session_factory, candidate_id, resume_url, file_hash=file_hash,
                                                manager=manager, force=force)
                stats["indexed" if done else "skipped"] += 1
            except Exception as exc:  # noqa: BLE001
                stats["failed"] += 1
                logger.warning("Backfill lỗi ở ứng viên %s: %s", candidate_id, exc)

    await asyncio.gather(*(one(cid, url, h) for cid, (url, h) in latest.items()))
    logger.info("Backfill chỉ mục CV xong: %s", stats)
    return stats
