"""Kiểm tra người gọi được xem một hồ sơ ứng tuyển — hỏi application-service bằng chính danh tính họ.

application-service áp đúng quy tắc phạm vi (Hiring Manager chỉ hồ sơ phòng ban mình…), nên
ai-service không phải chép lại các quy tắc đó.
"""

from __future__ import annotations

from fastapi import HTTPException

from app.core.auth import CurrentUser
from app.core.java_services import JavaServiceError, get_application_summary


async def require_application_access(application_id: int, user: CurrentUser) -> dict:
    """Trả summary hồ sơ nếu người gọi được xem; 403 / 404 / 502 nếu không."""
    try:
        return await get_application_summary(application_id, user.headers())
    except JavaServiceError as exc:
        if exc.status_code in (401, 403):
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem hồ sơ này") from exc
        if exc.status_code in (400, 404):
            raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ ứng tuyển") from exc
        raise HTTPException(status_code=502, detail="Không kết nối được application-service") from exc
