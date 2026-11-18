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
    _running = asyncio.create_task(backfill(async_session_factory, force=force))
    return {"started": True, "force": force}
