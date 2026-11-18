"""Trạng thái tuyển dụng của một ứng viên, suy ra từ các hồ sơ ứng tuyển (application-service) — chỉ đọc, không lưu.

Một ứng viên có thể có nhiều hồ sơ ở nhiều tin; gộp thành MỘT trạng thái theo thứ tự ưu tiên:
HIRED (đã được tuyển ở ít nhất một tin) > IN_PROGRESS (còn hồ sơ đang xử lý, lấy hồ sơ đi xa nhất) > REJECTED (mọi hồ sơ
đã bị loại/đóng) > NONE (chưa ứng tuyển tin nào, vd CV thêm thủ công vào kho).
"""

from __future__ import annotations

STATUSES = ("NONE", "IN_PROGRESS", "REJECTED", "HIRED")
DEFAULT_STATUSES = ("NONE", "IN_PROGRESS", "REJECTED")   # mặc định KHÔNG hiện người đã được tuyển


def _is_closed(app: dict) -> bool:
    return app.get("currentStageType") == "REJECTED" or bool(app.get("closedReason"))


def summarize(apps: list[dict]) -> dict:
    """{status, jobTitle, stageName, stageType, applicationId, applications: n}."""
    if not apps:
        return {"status": "NONE", "jobTitle": None, "stageName": None, "stageType": None, "applicationId": None, "applications": 0}
    hired = [a for a in apps if a.get("currentStageType") == "HIRED"]
    active = [a for a in apps if not _is_closed(a) and a.get("currentStageType") != "HIRED"]
    if hired:
        status, pick = "HIRED", max(hired, key=lambda a: a.get("hiredAt") or "")
    elif active:
        status, pick = "IN_PROGRESS", max(active, key=lambda a: a.get("currentStageOrder") or 0)
    else:
        status, pick = "REJECTED", max(apps, key=lambda a: a.get("appliedAt") or "")
    return {"status": status, "jobTitle": pick.get("jobTitle"), "stageName": pick.get("currentStageName"),
            "stageType": pick.get("currentStageType"), "applicationId": pick.get("id"), "applications": len(apps)}


def by_candidate(applications: list[dict]) -> dict[int, dict]:
    grouped: dict[int, list[dict]] = {}
    for a in applications:
        grouped.setdefault(a["candidateId"], []).append(a)
    return {cid: summarize(items) for cid, items in grouped.items()}
