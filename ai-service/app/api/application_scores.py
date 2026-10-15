"""
API điểm AI của hồ sơ ứng tuyển (giao diện HR).

- GET  /scores/{applicationId}                  điểm + nhận xét một hồ sơ (nhân sự nội bộ có quyền xem hồ sơ)
- POST /scores/{applicationId}/rescore          chấm lại ngay (đồng bộ, ~10–40 giây). Chỉ Admin / Recruiter
- POST /scores/rescore-posting?jobPostingId=    chấm bù mọi hồ sơ chưa có điểm hoặc FAILED của một tin
                                                (chạy nền). Chỉ Admin / Recruiter

Phạm vi quyền do application-service kiểm tra bằng chính danh tính người gọi (Hiring Manager chỉ
thấy hồ sơ phòng ban mình).
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.access import require_application_access
from app.core.auth import CurrentUser, current_user, require_hr, require_internal
from app.core.database import async_session_factory, get_db
from app.core.java_services import JavaServiceError, list_applications
from app.models import AIScore
from app.services.application_scoring import (
    COMPLETED,
    PENDING,
    PROCESSING,
    STALE_PROCESSING,
    ScoringInProgressError,
    mark_pending,
    score_application,
)
from app.workers.scoring_worker import schedule_scoring

router = APIRouter()


def to_dto(s: AIScore) -> dict:
    return {
        "applicationId": s.application_id,
        "jobPostingId": s.job_posting_id,
        "status": s.status,
        "totalScore": float(s.total_score) if s.total_score is not None else None,
        "tier": s.tier,
        "result": s.result,
        "provenance": s.provenance,
        "errorMessage": s.error_message,
        "scoredAt": s.scored_at.isoformat() if s.scored_at else None,
        "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
    }


async def _find(db: AsyncSession, application_id: int) -> AIScore | None:
    return (await db.execute(select(AIScore).where(AIScore.application_id == application_id))).scalar_one_or_none()


@router.get("/scores/{application_id}", summary="Điểm AI và nhận xét của một hồ sơ")
async def get_score(application_id: int, user: CurrentUser = Depends(current_user),
                    db: AsyncSession = Depends(get_db)) -> dict:
    require_internal(user)
    await require_application_access(application_id, user)
    score = await _find(db, application_id)
    if score is None:
        raise HTTPException(status_code=404, detail="Hồ sơ chưa được AI chấm")
    return to_dto(score)


@router.post("/scores/{application_id}/rescore", summary="Chấm lại một hồ sơ (HR)")
async def rescore(application_id: int, user: CurrentUser = Depends(current_user)) -> dict:
    require_hr(user)
    await require_application_access(application_id, user)
    try:
        score = await score_application(application_id, user.headers())
    except ScoringInProgressError as exc:
        raise HTTPException(status_code=409, detail="Hồ sơ đang được chấm, vui lòng đợi") from exc
    except JavaServiceError as exc:
        raise HTTPException(status_code=502, detail="Không đọc được thông tin hồ sơ") from exc
    return to_dto(score)


@router.post("/scores/rescore-posting", summary="Chấm tất cả hồ sơ chưa có điểm của một tin (HR)")
async def rescore_posting(
    job_posting_id: int = Query(..., alias="jobPostingId"),
    user: CurrentUser = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_hr(user)
    try:
        applications = await list_applications(job_posting_id, user.headers())
    except JavaServiceError as exc:
        raise HTTPException(status_code=502, detail="Không đọc được danh sách hồ sơ") from exc

    ids = [a["id"] for a in applications]
    rows = (await db.execute(select(AIScore).where(AIScore.application_id.in_(ids)))).scalars() if ids else []
    now = datetime.utcnow()
    # Bỏ qua hồ sơ đã có điểm, hoặc đang chờ / đang chấm chưa quá hạn. Chấm bù: chưa có điểm, FAILED,
    # và PENDING / PROCESSING quá hạn (tiến trình bị dừng giữa chừng, vd service khởi động lại).
    busy = {r.application_id for r in rows
            if r.status == COMPLETED
            or (r.status in (PENDING, PROCESSING) and r.updated_at and now - r.updated_at < STALE_PROCESSING)}
    todo = [a for a in applications if a["id"] not in busy]
    await mark_pending(async_session_factory, todo)
    schedule_scoring([a["id"] for a in todo], user.headers())
    return {"jobPostingId": job_posting_id, "total": len(applications), "queued": len(todo),
            "skipped": len(applications) - len(todo)}
