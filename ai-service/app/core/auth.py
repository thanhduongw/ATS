"""
Danh tính người gọi do api-gateway gắn (X-User-*), giống TrustedHeaderAuthenticationFilter bên Java.

Tin được header này vì: ai-service không publish cổng ra host (chỉ `expose` trong docker-compose),
mọi request đi qua api-gateway, và gateway xoá X-User-* do client tự gửi trước khi gắn danh tính
từ JWT (JwtAuthGlobalFilter).
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Header, HTTPException

INTERNAL_ROLES = {"COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER"}
HR_ROLES = {"COMPANY_ADMIN", "RECRUITER"}

# Danh tính khi ai-service tự gọi service Java (worker chạy nền). Các service Java chấp nhận
# role SYSTEM trong TrustedHeaderAuthenticationFilter (X-User-Id phải dương — giống notification-service).
SYSTEM_HEADERS = {"X-User-Id": "1", "X-User-Email": "ai-service@internal.local", "X-User-Role": "SYSTEM"}


@dataclass(frozen=True)
class CurrentUser:
    user_id: int
    email: str
    role: str
    department_id: int | None

    @property
    def is_hr(self) -> bool:
        return self.role in HR_ROLES

    def headers(self) -> dict[str, str]:
        """Chuyển tiếp danh tính khi gọi sang service Java (để chúng tự áp quyền phạm vi)."""
        h = {"X-User-Id": str(self.user_id), "X-User-Email": self.email, "X-User-Role": self.role}
        if self.department_id is not None:
            h["X-Department-Id"] = str(self.department_id)
        return h


def current_user(
    x_user_id: str | None = Header(None),
    x_user_email: str | None = Header(None),
    x_user_role: str | None = Header(None),
    x_department_id: str | None = Header(None),
) -> CurrentUser:
    if not x_user_id or not x_user_email or not x_user_role:
        raise HTTPException(status_code=401, detail="Thiếu danh tính người dùng")
    try:
        user_id = int(x_user_id)
        department_id = int(x_department_id) if x_department_id else None
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Danh tính người dùng không hợp lệ") from exc
    return CurrentUser(user_id, x_user_email, x_user_role.upper(), department_id)


def require_internal(user: CurrentUser) -> None:
    if user.role not in INTERNAL_ROLES:
        raise HTTPException(status_code=403, detail="Chỉ nhân sự nội bộ được dùng chức năng này")


def require_hr(user: CurrentUser) -> None:
    if user.role not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Chỉ HR được thực hiện thao tác này")


def internal_only(
    x_user_id: str | None = Header(None),
    x_user_email: str | None = Header(None),
    x_user_role: str | None = Header(None),
    x_department_id: str | None = Header(None),
) -> CurrentUser:
    """Dependency cấp router: chỉ nhân sự nội bộ."""
    user = current_user(x_user_id, x_user_email, x_user_role, x_department_id)
    require_internal(user)
    return user
