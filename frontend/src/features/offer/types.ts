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
  salaryOffered: number;
  contractTypeId: number;
  contractTypeName: string;
  startDate: string;
  probationMonths: number;
  benefits: string | null;
  allowance: number | null;
  note: string | null;
  requesterId: number;
  requesterName: string;
  approverId: number;
  approverName: string;
  status: OfferStatus;
  rejectReason: string | null;
  declineReasonName: string | null;
  declineNote: string | null;
  createdAt: string;
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
