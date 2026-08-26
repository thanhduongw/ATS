import axiosClient from "../../services/axiosClient";
import type {
  InterviewResponse,
  InterviewCreateRequest,
  EvaluationSubmitRequest,
  EvaluationResponse,
} from "./types";

export const getInterviews = (applicationId?: number) =>
  axiosClient.get<InterviewResponse[]>("/interview/interviews", {
    params: applicationId ? { applicationId } : {},
  });

export const getInterviewById = (id: number) =>
  axiosClient.get<InterviewResponse>(`/interview/interviews/${id}`);

export const createInterview = (data: InterviewCreateRequest) =>
  axiosClient.post<InterviewResponse>("/interview/interviews", data);

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