import axiosClient from "../../services/axiosClient";
import type {
  InterviewResponse,
  InterviewCreateRequest,
  InterviewBulkScheduleRequest,
  InterviewBulkScheduleItem,
  InterviewListFilters,
  EvaluationSubmitRequest,
  EvaluationResponse,
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

/** Xếp lịch hàng loạt cho nhiều hồ sơ — tự động chia khung giờ nối tiếp, tránh trùng lịch. */
export const bulkScheduleInterviews = (data: InterviewBulkScheduleRequest) =>
  axiosClient.post<InterviewBulkScheduleItem[]>("/interview/interviews/batch", data);

export const cancelInterview = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/cancel`);

/** Candidate xác nhận lịch phỏng vấn */
export const confirmInterview = (id: number) =>
  axiosClient.patch<InterviewResponse>(`/interview/interviews/${id}/confirm`);

export const getInterviewIcs = (id: number) =>
  axiosClient.get<Blob>(`/interview/interviews/${id}/ics`, { responseType: "blob" });

export const submitEvaluation = (interviewId: number, data: EvaluationSubmitRequest) =>
  axiosClient.post<EvaluationResponse>(
    `/interview/interviews/${interviewId}/evaluations`,
    data
  );

export const getEvaluations = (interviewId: number) =>
  axiosClient.get<EvaluationResponse[]>(
    `/interview/interviews/${interviewId}/evaluations`
  );
