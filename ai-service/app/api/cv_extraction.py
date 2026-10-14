"""
API trích xuất CV theo schema ExtractedCV.

1. GET  /cv-extractions?applicationId=            — kết quả trích xuất CV của hồ sơ (lưu DB; chưa có thì
                                                     trích xuất ngay, ~10–30 giây). Nhân sự nội bộ có quyền xem hồ sơ.
2. POST /cv-extractions/re-extract?applicationId= — trích xuất lại, bỏ qua bản đã lưu. Chỉ HR.
3. POST /extract-cv/upload                        — trích xuất từ file tải lên (form tạo ứng viên), không lưu DB.

CV lấy từ `resumeUrl` của hồ sơ (bản chụp lúc nộp) trên AWS S3 — client không truyền URL/khoá
file, nên không thể dùng API này để đọc file tuỳ ý.
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.api.access import require_application_access
from app.core.auth import CurrentUser, current_user, require_hr
from app.core.database import async_session_factory
from app.schemas.cv_extraction import CVExtractionResponse
from app.services.cv_extraction_engine import extract_cv_from_file_bytes
from app.services.cv_extraction_store import CVUnavailableError, get_or_extract, to_response

logger = logging.getLogger(__name__)

router = APIRouter()


async def _extract_for_application(application_id: int, user: CurrentUser, force: bool) -> dict:
    summary = await require_application_access(application_id, user)
    resume_url = summary.get("resumeUrl")
    if not resume_url:
        raise HTTPException(status_code=404, detail="Hồ sơ không có CV đính kèm")
    try:
        row = await get_or_extract(async_session_factory, resume_url, summary.get("candidateId"), force=force)
    except CVUnavailableError as exc:
        raise HTTPException(status_code=422, detail=f"Không đọc được file CV: {exc}") from exc
    return to_response(row)


@router.get(
    "/cv-extractions",
    summary="Kết quả trích xuất CV của một hồ sơ ứng tuyển",
    description=(
        "Trả kết quả đã lưu; chưa có thì tải CV từ S3, đọc nội dung và trích xuất bằng LLM "
        "(~10–30 giây), lưu lại để lần sau và để chấm điểm dùng chung."
    ),
)
async def get_cv_extraction(
    application_id: int = Query(..., alias="applicationId"),
    user: CurrentUser = Depends(current_user),
) -> dict:
    logger.info("CV extraction lookup: application=%s user=%s", application_id, user.user_id)
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
    logger.info("CV re-extraction: application=%s user=%s", application_id, user.user_id)
    return await _extract_for_application(application_id, user, force=True)


@router.post(
    "/extract-cv/upload",
    response_model=CVExtractionResponse,
    summary="Extract structured CV data from an uploaded file",
    description=(
        "Upload a CV file directly (multipart/form-data) and extract structured data. "
        "Used by the create-candidate form; the result is not stored. "
        "Supports PDF, DOCX, PNG, and JPEG files up to 10 MB."
    ),
)
async def extract_cv_upload(
    file: UploadFile = File(..., description="CV file (PDF, DOCX, PNG, or JPEG)"),
) -> CVExtractionResponse:
    """Extract structured CV data from a directly uploaded file."""
    logger.info("CV extraction upload: filename=%s content_type=%s", file.filename, file.content_type)
    file_bytes = await file.read()
    return await extract_cv_from_file_bytes(file_bytes, filename=file.filename)
