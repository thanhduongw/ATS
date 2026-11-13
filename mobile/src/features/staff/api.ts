import { apiClient } from "@/api/client";
import type {
  AiScoreDetail,
  ApplicationHistory,
  ApplicationRejectRequest,
  ApplicationResponse,
  EvaluationDraftRequest,
  EvaluationResponse,
  EvaluationSubmitRequest,
  InterviewHmRejectRequest,
  InterviewResponse,
  JobPostingResponse,
  OfferResponse,
  PageApplication,
  PageJobPosting,
  PageOffer,
  PageRequisition,
  RequisitionResponse,
  RequisitionUpdateRequest,
} from "@/types/api";

/**
 * API dành cho nhân viên (Chuyên viên tuyển dụng, Đại diện phòng ban) — cùng endpoint với web
 * (`frontend/src/features/*Api.ts`). Phạm vi dữ liệu do backend lọc theo vai trò: Đại diện phòng
 * ban chỉ nhận hồ sơ, buổi phỏng vấn, yêu cầu của phòng mình.
 */
const ALL = { size: 1000 };

export const staffApi = {
  /* Hồ sơ ứng tuyển */
  applications: () =>
    apiClient
      .get<PageApplication>("/application/applications", { params: ALL })
      .then((r) => r.data.content ?? []),
  application: (id: number) =>
    apiClient
      .get<ApplicationResponse>(`/application/applications/${id}`)
      .then((r) => r.data),
  history: (id: number) =>
    apiClient
      .get<ApplicationHistory[]>(`/application/applications/${id}/history`)
      .then((r) => r.data),
  /** Chuyển sang bước kế tiếp của pipeline — mỗi lần một bước. */
  advance: (id: number, note?: string) =>
    apiClient
      .patch<ApplicationResponse>(
        `/application/applications/${id}/advance-stage`,
        { note: note ?? null },
      )
      .then((r) => r.data),
  reject: (id: number, body: ApplicationRejectRequest) =>
    apiClient
      .patch<ApplicationResponse>(
        `/application/applications/${id}/reject`,
        body,
      )
      .then((r) => r.data),

  /* Phỏng vấn */
  interviews: (params?: { applicationId?: number; interviewerId?: number }) =>
    apiClient
      .get<InterviewResponse[]>("/interview/interviews", { params })
      .then((r) => r.data),
  interview: (id: number) =>
    apiClient
      .get<InterviewResponse>(`/interview/interviews/${id}`)
      .then((r) => r.data),
  applicationEvaluations: (applicationId: number) =>
    apiClient
      .get<EvaluationResponse[]>(
        `/interview/applications/${applicationId}/evaluations`,
      )
      .then((r) => r.data),
  interviewEvaluations: (interviewId: number) =>
    apiClient
      .get<EvaluationResponse[]>(
        `/interview/interviews/${interviewId}/evaluations`,
      )
      .then((r) => r.data),
  submitEvaluation: (interviewId: number, body: EvaluationSubmitRequest) =>
    apiClient
      .post<EvaluationResponse>(
        `/interview/interviews/${interviewId}/evaluations`,
        body,
      )
      .then((r) => r.data),
  saveEvaluationDraft: (interviewId: number, body: EvaluationDraftRequest) =>
    apiClient
      .put<EvaluationResponse>(
        `/interview/interviews/${interviewId}/evaluations/me`,
        body,
      )
      .then((r) => r.data),
  /** UR08: Chuyên viên tuyển dụng đồng ý giờ do người phỏng vấn đề xuất. */
  approveProposal: (id: number) =>
    apiClient
      .patch<InterviewResponse>(`/interview/interviews/${id}/approve-proposal`)
      .then((r) => r.data),
  /** UR08 "Giữ giờ cũ". */
  rejectProposal: (id: number) =>
    apiClient
      .patch<InterviewResponse>(`/interview/interviews/${id}/reject-proposal`)
      .then((r) => r.data),
  cancelInterview: (id: number) =>
    apiClient
      .patch<InterviewResponse>(`/interview/interviews/${id}/cancel`)
      .then((r) => r.data),
  /** UH05: người phỏng vấn xác nhận tham gia. */
  hmConfirm: (id: number) =>
    apiClient
      .patch<InterviewResponse>(`/interview/interviews/${id}/hm-confirm`)
      .then((r) => r.data),
  /** UH06: đề xuất giờ khác (kèm lý do). */
  hmReject: (id: number, body: InterviewHmRejectRequest) =>
    apiClient
      .patch<InterviewResponse>(`/interview/interviews/${id}/hm-reject`, body)
      .then((r) => r.data),

  /* Thư mời, yêu cầu, việc làm */
  offers: (params?: { jobPostingId?: number; status?: string }) =>
    apiClient
      .get<PageOffer>("/offer/offers", { params: { ...ALL, ...params } })
      .then((r) => r.data.content ?? []),
  offer: (id: number) =>
    apiClient.get<OfferResponse>(`/offer/offers/${id}`).then((r) => r.data),
  requisitions: () =>
    apiClient
      .get<PageRequisition>("/recruitment/requisitions", { params: ALL })
      .then((r) => r.data.content ?? ([] as RequisitionResponse[])),
  requisition: (id: number) =>
    apiClient.get<RequisitionResponse>(`/recruitment/requisitions/${id}`).then((r) => r.data),
  /** UH13: backend ghi đè cả yêu cầu → luôn gửi đủ mọi trường (lấy từ bản đang có). */
  updateRequisition: (id: number, body: RequisitionUpdateRequest) =>
    apiClient.put<RequisitionResponse>(`/recruitment/requisitions/${id}`, body).then((r) => r.data),
  submitRequisition: (id: number) =>
    apiClient.post<RequisitionResponse>(`/recruitment/requisitions/${id}/submit`).then((r) => r.data),
  postings: () =>
    apiClient
      .get<PageJobPosting>("/recruitment/postings", { params: ALL })
      .then((r) => r.data.content ?? ([] as JobPostingResponse[])),
  posting: (id: number) =>
    apiClient
      .get<JobPostingResponse>(`/recruitment/postings/${id}`)
      .then((r) => r.data),

  /** Điểm AI chi tiết (ai-service). 404 khi hồ sơ chưa được chấm → trả null. */
  aiScore: (applicationId: number) =>
    apiClient
      .get<AiScoreDetail>(`/v1/ai/scores/${applicationId}`)
      .then((r) => r.data)
      .catch((e: { response?: { status?: number } }) => {
        if (e.response?.status === 404) return null;
        throw e;
      }),
};
