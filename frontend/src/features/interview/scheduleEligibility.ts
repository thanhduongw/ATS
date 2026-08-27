import type { ApplicationResponse } from "../candidate/types";

/**
 * Hồ sơ chưa vượt qua Sàng lọc CV hoặc đã kết thúc thì backend sẽ từ chối lên lịch
 * (xem InterviewService.create / bulkSchedule) — lọc sẵn ở frontend để HR không chọn nhầm.
 */
export const INELIGIBLE_STAGE_TYPES = new Set(["APPLIED", "CV_SCREENING", "REJECTED", "HIRED"]);

export const isSchedulable = (application: ApplicationResponse) =>
    !INELIGIBLE_STAGE_TYPES.has(application.currentStageType);

/** Nhãn hiển thị trong ô chọn ứng viên: "Tên — Vị trí ứng tuyển". */
export const applicationOptionLabel = (application: ApplicationResponse) => {
    const position = application.jobPostingTitle ?? application.jobTitle;
    return position ? `${application.candidateName} — ${position}` : application.candidateName;
};
