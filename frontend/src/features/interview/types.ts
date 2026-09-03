export type InterviewFormat = "ONLINE" | "OFFLINE";
export type InterviewStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
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
  workLocationId: number | null;
  meetingLink: string | null;
  note: string | null;
  status: InterviewStatus;
  candidateConfirmed?: boolean;
  interviewers: InterviewerSummary[];
}

export interface InterviewCreateRequest {
  applicationId: number;
  scheduledAt: string;
  durationMinutes: number;
  format: InterviewFormat;
  workLocationId?: number | null;
  meetingLink?: string | null;
  note?: string | null;
  interviewerIds: number[];
}

export interface InterviewBulkScheduleRequest {
  applicationIds: number[];
  startTime: string;
  durationMinutesPerPerson: number;
  format: InterviewFormat;
  workLocationId?: number | null;
  meetingLink?: string | null;
  interviewerIds: number[];
  note?: string | null;
}

export interface InterviewBulkScheduleItem {
  applicationId: number;
  candidateName: string;
  scheduledAt: string;
  durationMinutes: number;
  shifted: boolean;
  interview: InterviewResponse;
}

export interface InterviewListFilters {
  interviewerId?: number;
  status?: InterviewStatus;
  fromDate?: string;
  toDate?: string;
}

export interface EvaluationScoreRequest {
  criteriaId: number;
  score: number;
  comment?: string | null;
}

export interface EvaluationSubmitRequest {
  overallRecommendation: RecommendationType;
  generalComment?: string | null;
  salaryProposed?: number | null;
  salaryNote?: string | null;
  scores: EvaluationScoreRequest[];
}

/** Khớp EvaluationScoreResponse Java */
export interface EvaluationScoreResponse {
  criteriaId: number;
  criteriaName: string;
  score: number;
  comment: string | null;
}

/** Alias cũ nếu component còn dùng tên ScoreDetail */
export type EvaluationScoreDetail = EvaluationScoreResponse;

export interface EvaluationResponse {
  interviewerId: number;
  interviewerName: string;
  overallRecommendation: RecommendationType | null;
  generalComment: string | null;
  salaryProposed: number | null;
  salaryNote: string | null;
  submittedAt: string | null;
  scores: EvaluationScoreResponse[];
}

export interface ApiMessageResponse {
  message: string;
}

export interface CandidateInterviewResponse {
  id: number;
  applicationId: number;
  scheduledAt: string;
  durationMinutes: number;
  format: InterviewFormat;
  workLocationId: number | null;
  meetingLink: string | null;
  status: InterviewStatus;
  candidateConfirmed: boolean;
  interviewerNames: string[];
}
