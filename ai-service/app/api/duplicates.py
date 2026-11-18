"""
API ứng viên nghi trùng (chỉ Admin / Recruiter — hiện thông tin liên hệ của ứng viên khác).

- GET  /duplicates?candidateId=&status=   cặp nghi trùng (mặc định PENDING), kèm thông tin hai ứng viên
- POST /duplicates/{id}/dismiss           "Không phải trùng": HR bác bỏ, hệ thống không báo lại cặp này
- POST /duplicates/{id}/confirm           "Đúng là trùng": ghi nhận; KHÔNG tự gộp hồ sơ

Hệ thống chỉ gắn cờ. Gộp hồ sơ kéo theo hồ sơ ứng tuyển, phỏng vấn, offer ở nhiều service nên do người xử lý.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, current_user, require_hr
from app.core.database import get_db
from app.core.java_services import JavaServiceError, get_candidate_summary
from app.models import DuplicateCandidate
from app.services.duplicates import CONFIRMED, DISMISSED, is_high_confidence

router = APIRouter()

MAX_ROWS = 100


def _person(candidate_id: int, summary: dict | None) -> dict:
    s = summary or {}
    return {"candidateId": candidate_id, "fullName": s.get("fullName"), "email": s.get("email"),
            "phone": s.get("phone"), "hasCv": bool(s.get("cvFileUrl"))}


@router.get("/duplicates", summary="Cặp ứng viên nghi trùng (HR)")
async def list_duplicates(
    candidate_id: int | None = Query(None, alias="candidateId"),
    status: Literal["PENDING", "DISMISSED", "CONFIRMED"] = "PENDING",
    user: CurrentUser = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_hr(user)
    q = select(DuplicateCandidate).where(DuplicateCandidate.status == status)
    if candidate_id is not None:
        q = q.where(or_(DuplicateCandidate.candidate_a == candidate_id, DuplicateCandidate.candidate_b == candidate_id))
    rows = (await db.execute(q.order_by(DuplicateCandidate.score.desc(), DuplicateCandidate.id).limit(MAX_ROWS))).scalars().all()

    ids = sorted({i for r in rows for i in (r.candidate_a, r.candidate_b)})
    try:
        summaries = dict(zip(ids, await asyncio.gather(*(get_candidate_summary(i, user.headers()) for i in ids))))
    except JavaServiceError as exc:
        raise HTTPException(status_code=502, detail="Không đọc được thông tin ứng viên") from exc

    items = []
    for r in rows:
        # Một trong hai ứng viên đã bị xoá thì cặp này không còn ý nghĩa — bỏ qua.
        if summaries.get(r.candidate_a) is None or summaries.get(r.candidate_b) is None:
            continue
        items.append({
            "id": r.id, "status": r.status, "score": float(r.score), "signals": list(r.signals),
            "highConfidence": is_high_confidence(list(r.signals)),
            "a": _person(r.candidate_a, summaries[r.candidate_a]),
            "b": _person(r.candidate_b, summaries[r.candidate_b]),
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        })
    return {"total": len(items), "items": items}


async def _review(duplicate_id: int, new_status: str, user: CurrentUser, db: AsyncSession) -> dict:
    require_hr(user)
    row = await db.get(DuplicateCandidate, duplicate_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy cặp nghi trùng")
    row.status, row.reviewed_by, row.reviewed_at = new_status, user.user_id, datetime.utcnow()
    return {"id": row.id, "status": row.status}


@router.post("/duplicates/{duplicate_id}/dismiss", summary="Không phải trùng (HR)")
async def dismiss(duplicate_id: int, user: CurrentUser = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    return await _review(duplicate_id, DISMISSED, user, db)


@router.post("/duplicates/{duplicate_id}/confirm", summary="Đúng là trùng (HR)")
async def confirm(duplicate_id: int, user: CurrentUser = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    return await _review(duplicate_id, CONFIRMED, user, db)
