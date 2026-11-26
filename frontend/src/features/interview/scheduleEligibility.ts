import type { ApplicationResponse } from "../candidate/types";
import { toFixedStage } from "../../app/stages";

/**
 * Hồ sơ chưa vượt qua Sàng lọc CV hoặc đã kết thúc thì backend sẽ từ chối lên lịch
 * (xem InterviewService.create / bulkSchedule) — lọc sẵn ở frontend để HR không chọn nhầm.
 */
export const INELIGIBLE_STAGE_TYPES = new Set(["APPLIED", "CV_SCREENING", "REJECTED", "HIRED"]);

/**
 * Chỉ hồ sơ đang ở giai đoạn Phỏng vấn mới lên lịch được (26/11/2026): trước đây hồ sơ đã rút đơn
 * hoặc đang ở Thư mời vẫn hiện trong danh sách chọn.
 */
export const isSchedulable = (application: ApplicationResponse) =>
    !INELIGIBLE_STAGE_TYPES.has(application.currentStageType)
    && toFixedStage(application.currentStageType) === "INTERVIEW";

/** Nhãn hiển thị trong ô chọn ứng viên: "Tên — Vị trí ứng tuyển". */
export const applicationOptionLabel = (application: ApplicationResponse) => {
    const position = application.jobPostingTitle ?? application.jobTitle;
    return position ? `${application.candidateName} — ${position}` : application.candidateName;
};
