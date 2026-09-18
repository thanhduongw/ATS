export type InterviewFormat = "ONLINE" | "OFFLINE";
export type InterviewStatus =
  | "SCHEDULED"
  | "HM_RESCHEDULE_PROPOSED"
  | "HM_CONFIRMED"
  | "CANDIDATE_CONFIRMED"
  | "EVALUATION_PENDING"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";
export type RecommendationType = "STRONG_YES" | "YES" | "NO" | "STRONG_NO";

/** Các trạng thái còn chiếm chỗ trên lịch của người phỏng vấn. */
export const INTERVIEW_BLOCKING: ReadonlySet<InterviewStatus> = new Set([
  "SCHEDULED",
  "HM_RESCHEDULE_PROPOSED",
  "HM_CONFIRMED",
  "CANDIDATE_CONFIRMED",
  "EVALUATION_PENDING",
]);

/** Các trạng thái HR còn có thể hủy. */
export const INTERVIEW_CANCELLABLE: ReadonlySet<InterviewStatus> = new Set([
  "SCHEDULED",
  "HM_RESCHEDULE_PROPOSED",
  "HM_CONFIRMED",
  "CANDIDATE_CONFIRMED",
]);

/** Các trạng thái HR còn có thể dời lịch. */
export const INTERVIEW_RESCHEDULABLE: ReadonlySet<InterviewStatus> = new Set([
  "SCHEDULED",
  "HM_CONFIRMED",
  "CANDIDATE_CONFIRMED",
]);

/** Các trạng thái của buổi đã hoặc đáng lẽ đã diễn ra. */
export const INTERVIEW_HELD: ReadonlySet<InterviewStatus> = new Set([
  "CANDIDATE_CONFIRMED",
  "EVALUATION_PENDING",
]);

/**
 * Buổi đã khép lại, không còn việc gì phải làm.
 *
 * Đây là nhóm dùng để trình bày, không phải bản sao của tập nào bên backend.
 */
export const INTERVIEW_CLOSED: ReadonlySet<InterviewStatus> = new Set([
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);

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
  /** Tin tuyển dụng và phòng ban của hồ sơ — giao diện tự ghép ra tên. */
  jobPostingId: number | null;
  departmentId: number | null;
  scheduledAt: string;
  durationMinutes: number;
  format: InterviewFormat;
  workLocationId: number | null;
  meetingLink: string | null;
  note: string | null;
  status: InterviewStatus;
  candidateConfirmed?: boolean;
  hmConfirmed: boolean;
  sessionId: number | null;
  proposedScheduledAt: string | null;
  proposalNote: string | null;
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

export interface InterviewHmRejectRequest {
  proposedScheduledAt?: string | null;
  note?: string | null;
}

export interface InterviewUpdateRequest {
  scheduledAt: string;
  durationMinutes: number;
  format: InterviewFormat;
  workLocationId?: number | null;
  meetingLink?: string | null;
  note?: string | null;
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
