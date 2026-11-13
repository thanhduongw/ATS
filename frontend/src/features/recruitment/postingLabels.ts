import type { StatusTone } from "../../app/theme";
import type { PostingStatus, WorkArrangement } from "./types";

/** Nhãn + sắc độ trạng thái tin (R06, R09). APPROVED = HR đã xác nhận nội dung, chờ đăng — mẫu R06 gọi là "Chờ duyệt" (Q2). */
export const POSTING_STATUS_VIEW: Record<PostingStatus, { label: string; tone: StatusTone }> = {
    OPEN: { label: "Đang tuyển", tone: "success" },
    APPROVED: { label: "Chờ duyệt", tone: "warning" },
    DRAFT: { label: "Bản nháp", tone: "neutral" },
    EDITING: { label: "Đang sửa", tone: "neutral" },
    PAUSED: { label: "Tạm dừng", tone: "warning" },
    CLOSED: { label: "Đã đóng", tone: "neutral" },
};

export const WORK_ARRANGEMENT_LABEL: Record<WorkArrangement, string> = {
    ONSITE: "Tại văn phòng", HYBRID: "Kết hợp", REMOTE: "Từ xa",
};

/** R06: tin đang tuyển đã tuyển đủ số cần → hiện "Đã đủ người" thay cho "Đang tuyển". */
export const POSTING_FILLED_VIEW: { label: string; tone: StatusTone } = { label: "Đã đủ người", tone: "brand" };
