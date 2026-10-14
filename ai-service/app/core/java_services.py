"""Client gọi các service Java (application, recruitment) qua mạng nội bộ."""

from __future__ import annotations

import httpx

from app.core.auth import SYSTEM_HEADERS
from app.core.config import get_settings

TIMEOUT = httpx.Timeout(30.0)


class JavaServiceError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


async def _get(url: str, headers: dict[str, str], params: dict | None = None) -> httpx.Response:
    """GET; lỗi mạng và HTTP >= 400 đều quy về JavaServiceError để nơi gọi xử lý một kiểu."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, headers=headers, params=params)
    except httpx.HTTPError as exc:
        raise JavaServiceError(f"GET {url} lỗi kết nối: {exc}") from exc
    if response.status_code >= 400:
        raise JavaServiceError(f"GET {url} -> {response.status_code}: {response.text[:200]}",
                               response.status_code)
    return response


async def get_application_summary(application_id: int, headers: dict[str, str] | None = None) -> dict:
    """Tóm tắt hồ sơ: id, candidateId, candidateName, jobPostingId, departmentId...

    Có `headers` (danh tính người dùng) thì application-service tự kiểm tra phạm vi quyền —
    dùng để xác minh người gọi được xem hồ sơ. Không có thì gọi bằng danh tính SYSTEM.
    """
    s = get_settings()
    r = await _get(f"{s.application_service_url}/api/application/applications/{application_id}/summary",
                   headers or SYSTEM_HEADERS)
    return r.json()


async def get_application(application_id: int, headers: dict[str, str] | None = None) -> dict:
    """Chi tiết hồ sơ (có `resumeUrl` — bản chụp CV lúc nộp)."""
    s = get_settings()
    r = await _get(f"{s.application_service_url}/api/application/applications/{application_id}",
                   headers or SYSTEM_HEADERS)
    return r.json()


async def list_applications(job_posting_id: int, headers: dict[str, str]) -> list[dict]:
    """Mọi hồ sơ của một tin mà NGƯỜI GỌI được xem (không truyền page/size → không phân trang)."""
    s = get_settings()
    r = await _get(f"{s.application_service_url}/api/application/applications", headers,
                   {"jobPostingId": job_posting_id})
    return r.json().get("content", [])


async def get_posting(job_posting_id: int, headers: dict[str, str] | None = None) -> dict:
    """Tin tuyển dụng.

    recruitment-service không nhận role SYSTEM, nên:
    - có danh tính nội bộ (HR chấm lại / chấm bù) → đọc tin ở mọi trạng thái;
    - không có (worker chạy nền khi ứng viên vừa nộp) → endpoint công khai, chỉ đọc được tin OPEN.
    """
    s = get_settings()
    if headers:
        url = f"{s.recruitment_service_url}/api/recruitment/postings/{job_posting_id}"
        return (await _get(url, headers)).json()
    url = f"{s.recruitment_service_url}/api/recruitment/public/jobs/{job_posting_id}"
    return (await _get(url, {})).json()
