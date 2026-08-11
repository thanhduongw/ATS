import type { RequisitionStatus } from "./types";

export const REQUISITION_STATUS_COLOR: Record<RequisitionStatus, string> = {
    DRAFT: "default",
    PENDING_APPROVAL: "gold",
    APPROVED: "green",
    REJECTED: "red",
    CHANGES_REQUESTED: "orange",
};

export const REQUISITION_STATUS_LABEL: Record<RequisitionStatus, string> = {
    DRAFT: "Bản nháp",
    PENDING_APPROVAL: "Chờ HR duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    CHANGES_REQUESTED: "Cần chỉnh sửa",
};
