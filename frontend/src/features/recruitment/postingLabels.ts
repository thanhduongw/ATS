import type { StatusTone } from "../../app/theme";
import type { PostingStatus, WorkArrangement } from "./types";

/** Nhãn + sắc độ trạng thái tin (R06, R09). APPROVED = HR đã xác nhận nội dung, chờ đăng. */
export const POSTING_STATUS_VIEW: Record<PostingStatus, { label: string; tone: StatusTone }> = {
    OPEN: { label: "Đang tuyển", tone: "success" },
    APPROVED: { label: "Chờ đăng", tone: "warning" },
    DRAFT: { label: "Bản nháp", tone: "neutral" },
    EDITING: { label: "Đang sửa", tone: "neutral" },
    PAUSED: { label: "Tạm dừng", tone: "warning" },
    CLOSED: { label: "Đã đóng", tone: "neutral" },
};

export const WORK_ARRANGEMENT_LABEL: Record<WorkArrangement, string> = {
    ONSITE: "Tại văn phòng", HYBRID: "Kết hợp", REMOTE: "Từ xa",
};
