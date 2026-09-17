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
  /** Dung de dieu huong sang trang ho so ung tuyen cua ung vien. */
  candidateId: number | null;
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
  /** Moc tao buoi phong van — doi chieu voi lich su chuyen vong de suy ra vong phong van. */
  createdAt?: string | null;
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

/** Ban nhap: moi truong deu tuy chon, chi gui cac tieu chi da cham diem. */
export interface EvaluationDraftRequest {
  overallRecommendation?: RecommendationType | null;
  generalComment?: string | null;
  salaryProposed?: number | null;
  salaryNote?: string | null;
  scores?: EvaluationScoreRequest[];
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
  id: number;
  /** Buổi phỏng vấn được chấm; null khi đây là bài HR chấm cho vòng không có phỏng vấn. */
  interviewId: number | null;
  interviewerId: number;
  interviewerName: string;
  overallRecommendation: RecommendationType | null;
  generalComment: string | null;
  salaryProposed: number | null;
  salaryNote: string | null;
  submittedAt: string | null;
  /**
   * Người đang xem có được đọc nội dung bài chấm này không. false khi bài bị che
   * (đồng nghiệp chưa mở khóa, hoặc mình chưa nộp bài của mình) — lúc đó chỉ
   * interviewerName và submittedAt là có nghĩa.
   */
  contentVisible: boolean;
  scores: EvaluationScoreResponse[];
}

/** Đánh giá của một hồ sơ trong loạt so sánh ứng viên. */
export interface ApplicationEvaluationsResponse {
  applicationId: number;
  evaluations: EvaluationResponse[];
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
