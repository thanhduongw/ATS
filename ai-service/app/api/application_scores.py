"""
API điểm AI của hồ sơ ứng tuyển (giao diện HR).

- GET  /scores/{applicationId}                  điểm + nhận xét một hồ sơ (nhân sự nội bộ có quyền xem hồ sơ)
- POST /scores/{applicationId}/rescore          chấm lại ngay (đồng bộ, ~10–40 giây). Chỉ Admin / Recruiter
- POST /scores/rescore-posting?jobPostingId=    chấm bù mọi hồ sơ chưa có điểm hoặc FAILED của một tin
                                                (chạy nền). Chỉ Admin / Recruiter
- POST /scores/rescore-all                      chấm lại TOÀN BỘ hồ sơ có CV (kể cả đã COMPLETED), chạy nền.
                                                Dùng sau khi đổi cách chấm. Chỉ Admin

Phạm vi quyền do application-service kiểm tra bằng chính danh tính người gọi (Hiring Manager chỉ
thấy hồ sơ phòng ban mình).
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.access import require_application_access
from app.core.auth import CurrentUser, current_user, require_admin, require_hr, require_internal
from app.core.database import async_session_factory, get_db
from app.core.java_services import JavaServiceError, list_applications
from app.core.vector_schema import vector_enabled
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
from app.api.talent import load_job_and_vector
from app.services.talent_search import similarity_for_candidates, split_by_similarity

logger = logging.getLogger(__name__)
router = APIRouter()


# [GIẢI THÍCH] Đổi một dòng ai_scores thành JSON trả cho frontend (tên trường kiểu camelCase).
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


# [GIẢI THÍCH] GET /api/v1/ai/scores/{id}: xem điểm một hồ sơ (thẻ AI ở trang chi tiết gọi API này).
# require_internal: chặn ứng viên. require_application_access: hỏi application-service người gọi có quyền
# xem hồ sơ này không (Hiring Manager phòng ban khác bị chặn). Chưa chấm -> 404.
@router.get("/scores/{application_id}", summary="Điểm AI và nhận xét của một hồ sơ")
async def get_score(application_id: int, user: CurrentUser = Depends(current_user),
                    db: AsyncSession = Depends(get_db)) -> dict:
    require_internal(user)
    await require_application_access(application_id, user)
    score = await _find(db, application_id)
    if score is None:
        raise HTTPException(status_code=404, detail="Hồ sơ chưa được AI chấm")
    return to_dto(score)


# [GIẢI THÍCH] POST .../rescore: nút "Chấm lại". require_hr: chỉ Admin/Recruiter.
# Chạy ngay và chờ kết quả (10-40 giây). Đang có người chấm -> 409.
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


# [GIẢI THÍCH] POST .../rescore-posting?jobPostingId=: nút "AI chấm hồ sơ của tin" (chỉ Admin/Recruiter).
# Lấy mọi hồ sơ của tin, bỏ qua hồ sơ đã có điểm hoặc đang chấm (busy), phần còn lại (todo)
# đánh dấu PENDING rồi đưa vào hàng chờ chấm nền. Trả về ngay số hồ sơ được xếp hàng / bỏ qua.
@router.post("/scores/rescore-posting", summary="Chấm tất cả hồ sơ chưa có điểm của một tin (HR)")
async def rescore_posting(
    job_posting_id: int = Query(..., alias="jobPostingId"),
    # Tuỳ chọn tiết kiệm chi phí (mặc định tắt): chỉ chấm N hồ sơ có CV gần nội dung tin nhất. Hồ sơ bị bỏ qua giữ
    # nguyên chưa có điểm và HR vẫn chấm tay được; lỗi embedding thì chấm tất cả. Không bỏ qua quá 20% (xem
    # MAX_SKIP_FRACTION: lọc vector làm mất Good Fit).
    top_n: int | None = Query(None, alias="topN", ge=1, le=1000),
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

    low_similarity = 0
    prefilter_applied = False
    if top_n is not None and len(todo) > top_n and vector_enabled():
        try:
            _, jd_vector = await load_job_and_vector(job_posting_id, user)
            by_cand = await similarity_for_candidates(db, jd_vector, [a["candidateId"] for a in todo])
            sim_by_app = {a["id"]: by_cand[a["candidateId"]] for a in todo if a["candidateId"] in by_cand}
            keep_ids, drop_ids = split_by_similarity([a["id"] for a in todo], sim_by_app, top_n)
            keep = set(keep_ids)
            todo = [a for a in todo if a["id"] in keep]
            low_similarity, prefilter_applied = len(drop_ids), True
        except HTTPException as exc:  # không lọc được thì chấm hết, không làm mất ứng viên
            logger.warning("Bỏ qua lọc sơ bộ cho tin %s: %s", job_posting_id, exc.detail)

    await mark_pending(async_session_factory, todo)
    schedule_scoring([a["id"] for a in todo], user.headers())
    return {"jobPostingId": job_posting_id, "total": len(applications), "queued": len(todo),
            "skipped": len(applications) - len(todo) - low_similarity,
            "skippedLowSimilarity": low_similarity, "prefilterApplied": prefilter_applied}


# POST .../rescore-all: sau khi đổi cách chấm, đưa MỌI hồ sơ có CV vào hàng chấm lại (kể cả đã COMPLETED).
# Chỉ COMPANY_ADMIN. Hồ sơ đang PROCESSING chưa quá hạn thì bỏ qua (đang được chấm ở nơi khác). Chạy nền, trả ngay.
@router.post("/scores/rescore-all", summary="Chấm lại toàn bộ hồ sơ có CV (Admin)")
async def rescore_all(
    user: CurrentUser = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_admin(user)
    try:
        applications = await list_applications(None, user.headers())
    except JavaServiceError as exc:
        raise HTTPException(status_code=502, detail="Không đọc được danh sách hồ sơ") from exc

    with_cv = [a for a in applications if a.get("resumeUrl")]
    ids = [a["id"] for a in with_cv]
    rows = (await db.execute(select(AIScore).where(AIScore.application_id.in_(ids)))).scalars() if ids else []
    now = datetime.utcnow()
    busy = {r.application_id for r in rows
            if r.status == PROCESSING and r.updated_at and now - r.updated_at < STALE_PROCESSING}
    todo = [a for a in with_cv if a["id"] not in busy]
    await mark_pending(async_session_factory, todo, include_completed=True)
    schedule_scoring([a["id"] for a in todo], user.headers())
    return {"total": len(applications), "withCv": len(with_cv), "queued": len(todo),
            "skipped": len(with_cv) - len(todo), "noCv": len(applications) - len(with_cv)}
