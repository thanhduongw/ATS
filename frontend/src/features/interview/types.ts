export type InterviewFormat = "ONLINE" | "OFFLINE";
export type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type RecommendationType = "STRONG_YES" | "YES" | "NO" | "STRONG_NO";

export interface InterviewerSummary {
  interviewerId: number;
  fullName: string;
  evaluationSubmitted: boolean;
}

export interface InterviewResponse {
  id: number;
  applicationId: number;
  candidateName: string;
  scheduledAt: string;
  durationMinutes: number;
  format: InterviewFormat;
  location: string | null;
  meetingLink: string | null;
  note: string | null;
  status: InterviewStatus;
  interviewers: InterviewerSummary[];
}

export interface InterviewCreateRequest {
  applicationId: number;
  scheduledAt: string;
  durationMinutes: number;
  format: InterviewFormat;
  location?: string | null;
  meetingLink?: string | null;
  note?: string | null;
  interviewerIds: number[];
}

export interface EvaluationScoreRequest {
  criteriaId: number;
  score: number;
  comment?: string | null;
}

export interface EvaluationSubmitRequest {
  overallRecommendation: RecommendationType;
  generalComment?: string | null;
  scores: EvaluationScoreRequest[];
}

export interface EvaluationScoreDetail {
  criteriaId: number;
  criteriaName: string;
  score: number;
  comment: string | null;
}

export interface EvaluationResponse {
  interviewerId: number;
  interviewerName: string;
  overallRecommendation: RecommendationType | null;
  generalComment: string | null;
  submittedAt: string | null;
  scores: EvaluationScoreDetail[];
}

export interface ApiMessageResponse {
  message: string;
}
