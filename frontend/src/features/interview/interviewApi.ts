import axiosClient from "../../services/axiosClient";
import type {
  InterviewSlotResponse,
  SlotBatchCreateRequest,
  InterviewResponse,
  InterviewCreateRequest,
  InterviewHmRejectRequest,
  InterviewUpdateRequest,
  InterviewBulkScheduleRequest,
  InterviewBulkScheduleItem,
  InterviewListFilters,
  EvaluationDraftRequest,
  EvaluationSubmitRequest,
  EvaluationResponse,
  ApplicationEvaluationsResponse,
  CandidateInterviewResponse,
} from "./types";

export const getInterviews = (
  applicationId?: number,
  filters?: InterviewListFilters,
) =>
  axiosClient.get<InterviewResponse[]>("/interview/interviews", {
    params: { applicationId, ...filters },
  });

export const getInterviewById = (id: number) =>
  axiosClient.get<InterviewResponse>(`/interview/interviews/${id}`);

export const getMyInterviews = () =>
  axiosClient.get<CandidateInterviewResponse[]>("/interview/interviews/my");

export const getMyInterviewById = (id: number) =>
  axiosClient.get<CandidateInterviewResponse>(`/interview/interviews/my/${id}`);

export const createInterview = (data: InterviewCreateRequest) =>
  axiosClient.post<InterviewResponse>("/interview/interviews", data);

export const updateInterview = (id: number, data: InterviewUpdateRequest) =>
  axiosClient.put<InterviewResponse>(`/interview/interviews/${id}`, data);

/** Xếp lịch hàng loạt cho nhiều hồ sơ — tự động chia khung giờ nối tiếp, tránh trùng lịch. */
export const bulkScheduleInterviews = (data: InterviewBulkScheduleRequest) =>
  axiosClient.post<InterviewBulkScheduleItem[]>("/interview/interviews/batch", data);

export const cancelInterview = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/cancel`);

/** Phòng ban xác nhận thời gian do HR sắp xếp. */
export const confirmInterviewByHm = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/hm-confirm`);

/** Phòng ban từ chối thời gian hiện tại, có thể kèm thời gian đề xuất. */
export const rejectInterviewByHm = (id: number, data: InterviewHmRejectRequest) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/hm-reject`, data);

/** HR duyệt thời gian do phòng ban đề xuất. */
export const approveHmProposal = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/approve-proposal`);

/** Ghi nhận ứng viên vắng mặt tại buổi phỏng vấn. */
export const markInterviewNoShow = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/no-show`);

/** Ứng viên xác nhận lịch phỏng vấn. */
export const confirmInterview = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/confirm`);

export const getInterviewIcs = (id: number) =>
  axiosClient.get<Blob>(`/interview/interviews/${id}/ics`, { responseType: "blob" });

export const submitEvaluation = (interviewId: number, data: EvaluationSubmitRequest) =>
  axiosClient.post<EvaluationResponse>(
    `/interview/interviews/${interviewId}/evaluations`,
    data
  );

/** Luu nhap bai cham cua chinh minh; goi lai bao nhieu lan cung duoc cho toi khi nop. */
export const saveEvaluationDraft = (interviewId: number, data: EvaluationDraftRequest) =>
  axiosClient.put<EvaluationResponse>(
    `/interview/interviews/${interviewId}/evaluations/me`,
    data,
  );

/** Toan bo danh gia cua mot ho so: ca bai theo buoi phong van lan bai HR cham roi. */
export const getApplicationEvaluations = (applicationId: number) =>
  axiosClient.get<EvaluationResponse[]>(
    `/interview/applications/${applicationId}/evaluations`,
  );

/** HR cham danh gia cho vong hien tai cua ho so, khong gan buoi phong van. */
export const submitApplicationEvaluation = (
  applicationId: number,
  data: EvaluationSubmitRequest,
) =>
  axiosClient.post<EvaluationResponse>(
    `/interview/applications/${applicationId}/evaluations`,
    data,
  );

/**
 * Danh gia cua nhieu ho so cung luc — bang so sanh ung vien goi mot lan thay vi goi lan luot
 * tung ho so cua tin tuyen dung.
 */
export const getEvaluationsByApplications = (applicationIds: number[]) =>
  axiosClient.get<ApplicationEvaluationsResponse[]>("/interview/evaluations", {
    params: { applicationIds: applicationIds.join(",") },
  });

export const getEvaluations = (interviewId: number) =>
  axiosClient.get<EvaluationResponse[]>(
    `/interview/interviews/${interviewId}/evaluations`
  );

// ===== Khung giờ đề xuất (C13): HR gửi nhiều khung giờ, ứng viên chọn 1, HR chốt thành buổi phỏng vấn =====
export const getSlotsByApplication = (applicationId: number) =>
  axiosClient.get<InterviewSlotResponse[]>("/interview/slots", { params: { applicationId } });

export const getMyPendingSlots = () =>
  axiosClient.get<InterviewSlotResponse[]>("/interview/slots/my-pending");

/** available=true: "tôi rảnh khung này" (ứng viên chọn); false: bỏ chọn. */
export const confirmSlot = (id: number, available: boolean) =>
  axiosClient.post<InterviewSlotResponse>(`/interview/slots/${id}/confirm`, { available });

/** R18 "Để ứng viên chọn": HR gửi nhiều khung giờ cho 1 hồ sơ. */
export const createSlotBatch = (data: SlotBatchCreateRequest) =>
  axiosClient.post<InterviewSlotResponse[]>("/interview/slots/batch", data);

/** HR chốt 1 khung giờ → tạo buổi phỏng vấn, huỷ các khung còn lại. */
export const selectSlot = (id: number) =>
  axiosClient.post<InterviewResponse>(`/interview/slots/${id}/select`, {});

/** R21: HR từ chối giờ người phỏng vấn đề xuất (giữ giờ cũ). */
export const rejectHmProposal = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/reject-proposal`);

/** R21: HR đặt lại danh sách người phỏng vấn. */
export const updateInterviewers = (id: number, interviewerIds: number[]) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/interviewers`, { interviewerIds });
