"""
Trích xuất JD một lần, lưu DB, dùng lại (bảng `jd_extractions`) — Bước 1 trong docs/DE_XUAT_CHAM_DIEM_CV.md.

- Khoá: sha256 nội dung JD (đã chuẩn hóa khoảng trắng) + phiên bản prompt trích xuất JD. Mọi CV ứng tuyển cùng
  một JD được so với cùng một danh sách yêu cầu và chỉ tốn một lượt gọi LLM; đổi prompt thì trích xuất lại.
- Ghi bằng INSERT ... ON CONFLICT nên hai hồ sơ cùng tin được chấm đồng thời không làm lỗi unique.
- Lần trước FAILED thì lần sau thử lại (không trả mãi kết quả lỗi).
- Chưa nối vào luồng chấm hồ sơ (phần 6).
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.llm_client import LLMError, LLMManager
from app.models import JDExtraction
from app.services.jd_extraction_engine import extract_jd, jd_content_hash
from app.services.prompts.jd_extraction import PROMPT_VERSION
from app.services.scoring.prompt import JobInfo

logger = logging.getLogger(__name__)

COMPLETED = "COMPLETED"
FAILED = "FAILED"


# [GIẢI THÍCH] Tìm bản trích xuất theo NỘI DUNG JD và đúng phiên bản prompt hiện tại (kể cả FAILED).
async def _find_by_hash(session: AsyncSession, content_hash: str) -> JDExtraction | None:
    stmt = select(JDExtraction).where(
        JDExtraction.content_hash == content_hash, JDExtraction.prompt_version == PROMPT_VERSION)
    return (await session.execute(stmt)).scalar_one_or_none()


# [GIẢI THÍCH] Lưu bản trích xuất: chưa có thì thêm, có rồi (cùng nội dung + cùng phiên bản prompt) thì cập nhật.
# job_posting_id giữ giá trị đã có (tin đầu tiên mang nội dung này); chỉ điền khi đang trống.
async def _upsert(session: AsyncSession, values: dict) -> JDExtraction:
    values = {**values, "prompt_version": PROMPT_VERSION, "updated_at": datetime.utcnow()}
    stmt = insert(JDExtraction).values(**values)
    set_ = {k: stmt.excluded[k] for k in values if k not in ("content_hash", "prompt_version", "job_posting_id")}
    set_["job_posting_id"] = func.coalesce(JDExtraction.job_posting_id, stmt.excluded.job_posting_id)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_jd_extractions_content_prompt", set_=set_,
    ).returning(JDExtraction.id)
    row_id = (await session.execute(stmt)).scalar_one()
    await session.commit()
    return await session.get(JDExtraction, row_id, populate_existing=True)


# [GIẢI THÍCH] TRÍCH XUẤT JD MỘT LẦN, DÙNG LẠI NHIỀU LẦN (theo đúng mẫu get_or_extract của CV).
# 1. Tính mã băm nội dung JD -> tìm (mã băm, phiên bản prompt) -> có bản COMPLETED thì trả về luôn (không gọi AI).
# 2. Chưa có -> gọi Gemini tách JD theo khuôn ExtractedJD -> lưu DB.
# Vì sao lưu theo NỘI DUNG JD chứ không theo id tin: HR sửa JD thì mã băm đổi, hệ thống tự trích xuất lại;
# không sửa thì mọi CV dùng chung một danh sách yêu cầu (so sánh công bằng giữa các ứng viên, đỡ tốn lượt gọi).
# force=True: bỏ qua bản cũ, trích xuất lại. LLM lỗi -> lưu FAILED kèm lý do và trả về; lần sau gọi lại sẽ thử lại.
async def get_or_extract_jd(
    session_factory: async_sessionmaker[AsyncSession],
    job: JobInfo,
    job_posting_id: int | None,
    *,
    manager: LLMManager | None = None,
    force: bool = False,
) -> JDExtraction:
    """Trả bản trích xuất JD COMPLETED có sẵn, hoặc trích xuất mới (lưu cả khi FAILED)."""
    content_hash = jd_content_hash(job)
    async with session_factory() as session:
        if not force:
            row = await _find_by_hash(session, content_hash)
            if row is not None and row.status == COMPLETED:
                return row

        base = {"content_hash": content_hash, "job_posting_id": job_posting_id}
        try:
            # GỌI GEMINI: tách JD thành danh sách yêu cầu theo khuôn ExtractedJD.
            result, usage = await extract_jd(job, manager)
        except LLMError as exc:
            logger.error("Trích xuất JD (tin %s) thất bại: %s", job_posting_id, exc)
            return await _upsert(session, {
                **base, "status": FAILED, "model": None, "result": None, "provenance": None,
                "error_message": str(exc)[:2000],
            })

        provenance = {
            "model": usage.model, "prompt_version": PROMPT_VERSION, "fallback_used": usage.fallback_used,
            "input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens,
            "estimated_cost_usd": usage.estimated_cost_usd, "latency_ms": usage.latency_ms,
            "retries": usage.retries,
        }
        return await _upsert(session, {
            **base, "status": COMPLETED, "model": usage.model,
            "result": result.model_dump(mode="json"), "provenance": provenance, "error_message": None,
        })
