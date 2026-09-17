export interface PageResponse<T> {
  content: T[];
  totalItems: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export type OfferStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ACCEPTED"
  | "DECLINED";

export interface OfferResponse {
  id: number;
  applicationId: number;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
  jobTitle: string | null;
  salaryOffered: number;
  contractTypeId: number;
  contractTypeName: string;
  startDate: string;
  probationMonths: number;
  benefits: string | null;
  allowance: number | null;
  /** Ghi chú nội bộ — chỉ HR và admin đọc được, không bao giờ gửi cho ứng viên. */
  note: string | null;
  /** Ghi chú in trên thư mời — phần duy nhất ứng viên đọc được. */
  candidateVisibleNote: string | null;
  requesterId: number;
  requesterName: string;
  approverId: number;
  approverName: string;
  status: OfferStatus;
  rejectReason: string | null;
  declineReasonName: string | null;
  declineNote: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  responseDeadline: string | null;
}

export interface OfferCreateRequest {
  applicationId: number;
  salaryOffered: number;
  contractTypeId: number;
  startDate: string;
  probationMonths: number;
  benefits?: string | null;
  allowance?: number | null;
  note?: string | null;
  candidateVisibleNote?: string | null;
  approverId: number;
  responseDeadline?: string | null;
}

export interface OfferUpdateRequest {
  salaryOffered: number;
  contractTypeId: number;
  startDate: string;
  probationMonths: number;
  benefits?: string | null;
  allowance?: number | null;
  note?: string | null;
  candidateVisibleNote?: string | null;
  approverId: number;
  responseDeadline?: string | null;
}

export interface OfferRejectRequest {
  reason: string;
}

export interface OfferDeclineRequest {
  declineReasonId: number;
  note?: string | null;
}

export interface ApiMessageResponse {
  message: string;
}

export interface CandidateOfferResponse {
  id: number;
  applicationId: number;
  candidateName: string;
  /** Tên vị trí — ứng viên cần thấy việc mình ứng tuyển, không phải mã hồ sơ. */
  jobTitle: string | null;
  salaryOffered: number;
  contractTypeId: number;
  contractTypeName: string;
  startDate: string;
  probationMonths: number;
  responseDeadline: string | null;
  benefits: string | null;
  allowance: number | null;
  /** Ghi chú nội bộ không bao giờ xuất hiện ở đây. */
  candidateVisibleNote: string | null;
  status: OfferStatus;
  declineReasonName: string | null;
  declineNote: string | null;
  createdAt: string;
}
