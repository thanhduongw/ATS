"""
Quản trị chỉ mục vector (chỉ Company Admin).

- GET  /embeddings/status    số ứng viên / đoạn đã lập chỉ mục, model đang dùng
- POST /embeddings/backfill  lập chỉ mục mọi CV đã trích xuất (chạy nền); ?force=true để embed lại (đổi model)
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, current_user
from app.core.config import get_settings
from app.core.database import async_session_factory, get_db
from app.core.vector_schema import vector_enabled
from app.models import CandidateSearchProfile, CVDocumentChunk
from app.core.java_services import JavaServiceError, get_candidate_summary, get_talent_pool_eligible
from app.services.cv_indexing import backfill

logger = logging.getLogger(__name__)
router = APIRouter()

_running: asyncio.Task | None = None


def _require_admin(user: CurrentUser) -> None:
    if user.role != "COMPANY_ADMIN":
        raise HTTPException(status_code=403, detail="Chỉ Admin được quản lý chỉ mục tìm kiếm")


@router.get("/embeddings/status", summary="Trạng thái chỉ mục vector (Admin)")
async def status(user: CurrentUser = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    _require_admin(user)
    s = get_settings()
    body = {"vectorEnabled": vector_enabled(), "model": s.embedding_model, "dimensions": s.embedding_dimensions,
            "backfillRunning": _running is not None and not _running.done()}
    if vector_enabled():
        body["candidates"] = (await db.execute(select(func.count()).select_from(CandidateSearchProfile))).scalar_one()
        body["chunks"] = (await db.execute(select(func.count()).select_from(CVDocumentChunk))).scalar_one()
    return body


@router.post("/embeddings/backfill", summary="Lập chỉ mục mọi CV đã trích xuất (Admin, chạy nền)", status_code=202)
async def start_backfill(force: bool = Query(False), user: CurrentUser = Depends(current_user)) -> dict:
    global _running
    _require_admin(user)
    if not vector_enabled():
        raise HTTPException(status_code=503, detail="pgvector chưa bật trên Postgres — không lập chỉ mục được")
    if _running is not None and not _running.done():
        raise HTTPException(status_code=409, detail="Đang có một lượt lập chỉ mục chạy")
    extra = await _cv_urls_from_candidate_service(user)
    _running = asyncio.create_task(backfill(async_session_factory, force=force, extra_sources=extra))
    return {"started": True, "force": force, "candidatesFromCandidateService": len(extra)}


async def _cv_urls_from_candidate_service(user: CurrentUser) -> dict[int, str]:
    """{candidate_id: cvFileUrl} của ứng viên trong Talent Pool (đã đồng ý). Lỗi thì trả rỗng: backfill vẫn chạy với cv_facts."""
    try:
        eligible = await get_talent_pool_eligible(user.headers())
    except JavaServiceError as exc:
        logger.warning("Backfill: không đọc được danh sách ứng viên: %s", exc)
        return {}
    out: dict[int, str] = {}
    for c in eligible:
        if not c.get("hasCv"):
            continue
        try:
            summary = await get_candidate_summary(int(c["id"]), user.headers())
        except JavaServiceError:
            continue
        if summary and summary.get("cvFileUrl"):
            out[int(c["id"])] = summary["cvFileUrl"]
    return out
