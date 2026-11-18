"""
API dữ kiện CV (`CVFacts`) của hồ sơ ứng tuyển — khối "Phân tích CV" ở trang chi tiết hồ sơ.

1. GET  /cv-extractions?applicationId=            — dữ kiện CV của hồ sơ (lưu DB; chưa có thì trích xuất ngay,
                                                     ~10–30 giây). Nhân sự nội bộ có quyền xem hồ sơ.
2. POST /cv-extractions/re-extract?applicationId= — trích xuất lại, bỏ qua bản đã lưu. Chỉ HR.

CV lấy từ `resumeUrl` của hồ sơ (bản chụp lúc nộp) trên AWS S3 — client không truyền URL/khoá
file, nên không thể dùng API này để đọc file tuỳ ý. CV được che thông tin cá nhân trước khi trích xuất.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.access import require_application_access
from app.core.auth import CurrentUser, current_user, require_hr
from app.core.database import async_session_factory
from app.core.public_errors import extraction_error_message
from app.models import CVFactsRecord
from app.services.facts_store import COMPLETED, CVUnavailableError, get_or_extract_cv

logger = logging.getLogger(__name__)

router = APIRouter()


def to_response(row: CVFactsRecord) -> dict:
    """Dạng trả cho frontend: `result` là CVFacts {facts[], limitations[]}."""
    body = {
        "status": "success" if row.status == COMPLETED else "error",
        "extraction_id": row.id,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "result": row.result if row.status == COMPLETED else None,
        "provenance": row.provenance if row.status == COMPLETED else {"prompt_version": row.prompt_version},
        "error_code": None if row.status == COMPLETED else row.error_code,
        # Bảng giữ lỗi gốc để tra cứu; giao diện chỉ nhận câu tiếng Việt.
        "error_message": None if row.status == COMPLETED else extraction_error_message(
            row.error_code, row.error_message),
    }
    return body


async def _extract_for_application(application_id: int, user: CurrentUser, force: bool) -> dict:
    summary = await require_application_access(application_id, user)
    resume_url = summary.get("resumeUrl")
    if not resume_url:
        raise HTTPException(status_code=404, detail="Hồ sơ không có CV đính kèm")
    try:
        row = await get_or_extract_cv(async_session_factory, resume_url, summary.get("candidateId"), force=force)
    except CVUnavailableError as exc:
        logger.warning("Không tải được CV của hồ sơ %s: %s", application_id, exc)
        raise HTTPException(status_code=422, detail="Không tải được file CV của hồ sơ này") from exc
    return to_response(row)


@router.get(
    "/cv-extractions",
    summary="Dữ kiện CV của một hồ sơ ứng tuyển",
    description=(
        "Trả dữ kiện đã lưu; chưa có thì tải CV từ S3, đọc nội dung, che thông tin cá nhân và trích xuất bằng LLM "
        "(~10–30 giây), lưu lại để lần sau và để chấm điểm dùng chung."
    ),
)
async def get_cv_extraction(
    application_id: int = Query(..., alias="applicationId"),
    user: CurrentUser = Depends(current_user),
) -> dict:
    logger.info("CV facts lookup: application=%s user=%s", application_id, user.user_id)
    return await _extract_for_application(application_id, user, force=False)


@router.post(
    "/cv-extractions/re-extract",
    summary="Trích xuất lại CV của một hồ sơ (HR)",
)
async def re_extract_cv(
    application_id: int = Query(..., alias="applicationId"),
    user: CurrentUser = Depends(current_user),
) -> dict:
    require_hr(user)
    logger.info("CV facts re-extraction: application=%s user=%s", application_id, user.user_id)
    return await _extract_for_application(application_id, user, force=True)
