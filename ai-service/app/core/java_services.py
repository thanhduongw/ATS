"""Client gọi các service Java (application, recruitment, masterdata) qua mạng nội bộ."""

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


async def list_applications(job_posting_id: int | None, headers: dict[str, str]) -> list[dict]:
    """Mọi hồ sơ của một tin (None = mọi tin) mà NGƯỜI GỌI được xem (không truyền page/size → không phân trang)."""
    s = get_settings()
    params = {"jobPostingId": job_posting_id} if job_posting_id is not None else None
    r = await _get(f"{s.application_service_url}/api/application/applications", headers, params)
    return r.json().get("content", [])


# [GIẢI THÍCH] Tên các kỹ năng HR chọn cho tin: tin chỉ lưu skillIds, tên nằm ở danh mục kỹ năng của masterdata-service.
# Giữ đúng thứ tự skillIds; id không có trong danh mục thì bỏ qua.
async def get_skill_names(skill_ids: list[int]) -> list[str]:
    """Tên kỹ năng theo id (GET /api/masterdata/skills, danh tính SYSTEM).

    Raises:
        JavaServiceError: không gọi được masterdata-service.
    """
    if not skill_ids:
        return []
    s = get_settings()
    r = await _get(f"{s.masterdata_service_url}/api/masterdata/skills", SYSTEM_HEADERS)
    names = {item.get("id"): item.get("name") for item in r.json()}
    return [names[i] for i in skill_ids if names.get(i)]


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


# Talent Pool: ứng viên đã đồng ý riêng, chưa bị xoá (candidate-service quyết định, ai-service không tự suy ra).
async def get_talent_pool_eligible(headers: dict[str, str], pool_status: str | None = None) -> list[dict]:
    """Danh sách ứng viên đủ điều kiện xuất hiện trong Talent Pool, chuyển tiếp danh tính HR."""
    s = get_settings()
    params = {"poolStatus": pool_status} if pool_status else None
    r = await _get(f"{s.candidate_service_url}/api/candidate/candidates/talent-pool/eligible", headers, params)
    return r.json()


async def get_candidate_summary(candidate_id: int, headers: dict[str, str]) -> dict | None:
    """Tóm tắt ứng viên (id, fullName, email, phone, cvFileUrl); None nếu không còn (đã xoá) hoặc không có quyền."""
    s = get_settings()
    try:
        r = await _get(f"{s.candidate_service_url}/api/candidate/candidates/{candidate_id}/summary", headers)
    except JavaServiceError as exc:
        if exc.status_code is not None and exc.status_code < 500:
            return None
        raise
    return r.json()
