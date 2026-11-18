"""
Embedding của JD (bảng `jd_embeddings`), dùng cho:
- gợi ý ứng viên trong Talent Pool cho một tin tuyển dụng;
- độ tương đồng CV ↔ JD hiện ở danh sách hồ sơ.

Khoá theo nội dung JD đã chuẩn hoá khoảng trắng (cùng hàm băm với `jd_extractions`): mọi tin cùng nội dung dùng chung
một vector; HR sửa JD thì mã băm đổi và tự embed lại. Embed JD như truy vấn (RETRIEVAL_QUERY), CV như tài liệu.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import JDEmbedding
from app.services.embeddings import RETRIEVAL_QUERY, Embedder, get_embedder
from app.services.job_info import jd_content_hash
from app.services.job_info import JobInfo

logger = logging.getLogger(__name__)

JD_TASK = RETRIEVAL_QUERY
MAX_JD_CHARS = 8000


async def get_or_embed_jd(
    session_factory: async_sessionmaker[AsyncSession],
    job: JobInfo,
    job_posting_id: int | None = None,
    *,
    embedder: Embedder | None = None,
) -> list[float]:
    """Vector của JD: lấy từ DB nếu nội dung đã embed, chưa thì embed rồi lưu.

    Raises:
        EmbeddingError: không tạo được embedding.
        ValueError: JD không có nội dung.
    """
    text = job.as_text()[:MAX_JD_CHARS]
    if not text.strip():
        raise ValueError("Tin tuyển dụng chưa có nội dung để so khớp")
    embedder = embedder or get_embedder()
    content_hash = jd_content_hash(job)

    async with session_factory() as session:
        row = (await session.execute(select(JDEmbedding.embedding).where(
            JDEmbedding.content_hash == content_hash, JDEmbedding.model == embedder.model_name,
            JDEmbedding.task == JD_TASK))).scalar_one_or_none()
        if row is not None:
            return [float(x) for x in row]

    vector = (await embedder.embed([text], JD_TASK))[0]
    async with session_factory() as session:
        stmt = insert(JDEmbedding).values(
            content_hash=content_hash, model=embedder.model_name, task=JD_TASK, embedding=vector,
            job_posting_id=job_posting_id).on_conflict_do_nothing()  # hai yêu cầu đồng thời: bản đến sau bỏ qua
        await session.execute(stmt)
        await session.commit()
    return vector
