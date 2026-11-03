import type { StatusTone } from "@/theme";
import type {
  InterviewResponse,
  JobPostingResponse,
  OfferResponse,
  RequisitionResponse,
} from "@/types/api";
import { STRINGS } from "@/lib/strings";

/**
 * Enum trạng thái → { nhãn, sắc độ } cho `<StatusChip>` (quy tắc 8 của CLAUDE.md).
 * Màn hình KHÔNG tự chọn màu cho trạng thái — gọi hàm ở đây rồi trải vào chip:
 *   <StatusChip {...interviewStatus(item.status, "CANDIDATE")} />
 *
 * Sắc độ theo artboard `Main` của canvas: sàng lọc → brand, phỏng vấn → tím,
 * chờ người khác xử lý → cam, xong tốt → xanh lá, hỏng → đỏ, còn lại → xám.
 */
export type StatusView = { label: string; tone: StatusTone };

type InterviewStatus = NonNullable<InterviewResponse["status"]>;
type OfferStatus = NonNullable<OfferResponse["status"]>;
type RequisitionStatus = NonNullable<RequisitionResponse["status"]>;
type PostingStatus = NonNullable<JobPostingResponse["status"]>;
type Viewer = "CANDIDATE" | "STAFF";

const UNKNOWN: StatusView = { label: STRINGS.status.unknown, tone: "neutral" };

/** DS06 "Màu trạng thái": Ứng tuyển xám · Sàng lọc xanh lá · Phỏng vấn tím · Thư mời cam · Đã tuyển xanh dương · Từ chối đỏ. */
const STAGE_TONE: Record<keyof typeof STRINGS.status.stage, StatusTone> = {
  APPLIED: "neutral",
  CV_SCREENING: "success",
  HR_SCREENING: "success",
  TECHNICAL_INTERVIEW: "interview",
  HR_INTERVIEW: "interview",
  FINAL_INTERVIEW: "interview",
  OFFER: "warning",
  HIRED: "brand",
  REJECTED: "danger",
  CUSTOM: "success",
};

/**
 * Giai đoạn hiện tại của đơn, quy về 6 giai đoạn cố định. `currentStageType` backend sinh là
 * `string` nên nhận string.
 */
export function stageStatus(stageType?: string, stageName?: string): StatusView {
  if (stageType && stageType in STAGE_TONE) {
    const key = stageType as keyof typeof STAGE_TONE;
    // Luôn hiện 1 trong 6 giai đoạn cố định, kể cả vòng CUSTOM (xếp vào Sàng lọc).
    const label = STRINGS.status.stage[key];
    return { label, tone: STAGE_TONE[key] };
  }
  return stageName ? { label: stageName, tone: "neutral" } : UNKNOWN;
}

const INTERVIEW_TONE: Record<InterviewStatus, StatusTone> = {
  SCHEDULED: "warning",
  HM_RESCHEDULE_PROPOSED: "warning",
  HM_CONFIRMED: "warning",
  CANDIDATE_CONFIRMED: "success",
  EVALUATION_PENDING: "brand",
  COMPLETED: "neutral",
  NO_SHOW: "danger",
  CANCELLED: "neutral",
};

/**
 * Ứng viên chỉ thấy buổi PV từ HM_CONFIRMED trở đi, và EVALUATION_PENDING với họ là
 * "Đã diễn ra" (xem "Sự thật về backend" trong CLAUDE.md).
 */
export function interviewStatus(status: InterviewStatus | undefined, viewer: Viewer): StatusView {
  if (!status) return UNKNOWN;
  if (viewer === "CANDIDATE") {
    const override = STRINGS.status.interviewForCandidate as Partial<Record<InterviewStatus, string>>;
    if (override[status]) {
      return { label: override[status], tone: status === "HM_CONFIRMED" ? "warning" : "neutral" };
    }
  }
  return { label: STRINGS.status.interview[status], tone: INTERVIEW_TONE[status] };
}

const OFFER_TONE: Record<OfferStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "brand",
  REJECTED: "danger",
  ACCEPTED: "success",
  DECLINED: "danger",
};

/** Duyệt offer = gửi luôn cho ứng viên, nên APPROVED với ứng viên là "Chờ phản hồi". */
export function offerStatus(status: OfferStatus | undefined, viewer: Viewer): StatusView {
  if (!status) return UNKNOWN;
  // EXPIRED có từ offer-service (docs/UI R25) nhưng type sinh tự động chưa cập nhật —
  // chạy lại `npm run gen:types` khi backend chạy thì có thể bỏ nhánh này.
  if ((status as string) === "EXPIRED") return { label: STRINGS.status.offerExpired, tone: "neutral" };
  if (viewer === "CANDIDATE") {
    if (status === "APPROVED") return { label: STRINGS.status.offerForCandidate.APPROVED, tone: "warning" };
    if (status === "DECLINED") return { label: STRINGS.status.offerForCandidate.DECLINED, tone: "neutral" };
  }
  return { label: STRINGS.status.offer[status], tone: OFFER_TONE[status] };
}

const REQUISITION_TONE: Record<RequisitionStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CHANGES_REQUESTED: "warning",
};

export function requisitionStatus(status: RequisitionStatus | undefined): StatusView {
  if (!status) return UNKNOWN;
  return { label: STRINGS.status.requisition[status], tone: REQUISITION_TONE[status] };
}

const POSTING_TONE: Record<PostingStatus, StatusTone> = {
  DRAFT: "neutral",
  EDITING: "neutral",
  APPROVED: "brand",
  OPEN: "success",
  PAUSED: "warning",
  CLOSED: "neutral",
};

export function postingStatus(status: PostingStatus | undefined): StatusView {
  if (!status) return UNKNOWN;
  return { label: STRINGS.status.posting[status], tone: POSTING_TONE[status] };
}

/**
 * Bốn chặng ứng viên nhìn thấy (canvas M08/M09): Đã nộp → Sơ tuyển → Phỏng vấn → Thư mời.
 * Backend chỉ trả vòng HIỆN TẠI (không có lịch sử từng vòng), nên tiến trình suy từ loại
 * vòng: mọi chặng đứng trước chặng hiện tại coi như đã qua.
 */
export type ApplicationPhase = {
  /** 0..3 — chặng đang ở. */
  step: number;
  rejected: boolean;
  hired: boolean;
  ended: boolean;
};

export function applicationPhase(stageType?: string): ApplicationPhase {
  switch (stageType) {
    case "APPLIED":
      return { step: 0, rejected: false, hired: false, ended: false };
    case "TECHNICAL_INTERVIEW":
    case "HR_INTERVIEW":
    case "FINAL_INTERVIEW":
      return { step: 2, rejected: false, hired: false, ended: false };
    case "OFFER":
      return { step: 3, rejected: false, hired: false, ended: false };
    case "HIRED":
      return { step: 3, rejected: false, hired: true, ended: true };
    case "REJECTED":
      return { step: 0, rejected: true, hired: false, ended: true };
    // CV_SCREENING, HR_SCREENING và vòng CUSTOM của công ty → coi là đang sơ tuyển.
    default:
      return { step: 1, rejected: false, hired: false, ended: false };
  }
}
