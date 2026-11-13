/**
 * Chỗ rút gọn DUY NHẤT cho type backend.
 * Component KHÔNG viết `paths["/api/..."]["get"]["responses"][200]...` — import từ đây.
 * Tên schema bên dưới đã đối chiếu trực tiếp với file trong `generated/`, không đoán.
 * Backend đổi DTO → chạy `npm run gen:types`, lỗi sẽ hiện ở đúng file này.
 */
import type { components as AuthC } from "./generated/auth";
import type { components as OfferC } from "./generated/offer";
import type { components as InterviewC } from "./generated/interview";
import type { components as ApplicationC } from "./generated/application";
import type { components as RecruitmentC } from "./generated/recruitment";
import type { components as CandidateC } from "./generated/candidate";
import type { components as NotificationC } from "./generated/notification";
import type { components as MasterDataC } from "./generated/masterdata";

// --- Theo mục 1.5 của MOBILE_WEEK_1.md ---
export type LoginResponse        = AuthC["schemas"]["LoginResponse"];
export type UserProfileResponse  = AuthC["schemas"]["UserProfileResponse"];
export type CompanyResponse      = AuthC["schemas"]["CompanyResponse"];
export type JobPostingResponse   = RecruitmentC["schemas"]["JobPostingResponse"];
export type RequisitionResponse  = RecruitmentC["schemas"]["JobRequisitionResponse"];
export type RequisitionUpdateRequest = RecruitmentC["schemas"]["JobRequisitionUpdateRequest"];
export type CandidateApplication = ApplicationC["schemas"]["CandidateApplicationResponse"];
export type ApplicationResponse  = ApplicationC["schemas"]["ApplicationResponse"];
export type InterviewResponse    = InterviewC["schemas"]["InterviewResponse"];
export type EvaluationResponse   = InterviewC["schemas"]["EvaluationResponse"];
export type CandidateOffer       = OfferC["schemas"]["CandidateOfferResponse"];
export type OfferResponse        = OfferC["schemas"]["OfferResponse"];
export type CandidateSelf        = CandidateC["schemas"]["CandidateSelfResponse"];
export type NotificationResponse = NotificationC["schemas"]["NotificationResponse"];
export type InterviewCriteria    = MasterDataC["schemas"]["InterviewCriteriaResponse"];

// --- Bổ sung: tuần 1 chắc chắn cần ---
/** B2 nộp đơn: `recruitmentSourceId` là trường BẮT BUỘC, phải cho ứng viên chọn. */
export type RecruitmentSource    = MasterDataC["schemas"]["RecruitmentSourceResponse"];
/** B1 bộ lọc (ngày 5): `GET /recruitment/public/jobs?employmentTypeId=&workLocationId=` */
export type EmploymentType       = MasterDataC["schemas"]["EmploymentTypeResponse"];
export type WorkLocation         = MasterDataC["schemas"]["WorkLocationResponse"];
export type Department           = MasterDataC["schemas"]["DepartmentResponse"];
/** `GET /interview/interviews/my` — CHỈ dành cho CANDIDATE. */
export type CandidateInterview   = InterviewC["schemas"]["CandidateInterviewResponse"];
export type ApplicationCreateRequest = ApplicationC["schemas"]["ApplicationCreateRequest"];
export type LoginRequest         = AuthC["schemas"]["LoginRequest"];
export type CandidateRegistrationRequest = AuthC["schemas"]["CandidateRegistrationRequest"];
export type VerifyEmailRequest   = AuthC["schemas"]["VerifyEmailRequest"];
export type ResendOtpRequest     = AuthC["schemas"]["ResendOtpRequest"];
export type RefreshTokenRequest  = AuthC["schemas"]["RefreshTokenRequest"];
export type ForgotPasswordRequest = AuthC["schemas"]["ForgotPasswordRequest"];
export type ResetPasswordRequest = AuthC["schemas"]["ResetPasswordRequest"];
/** Mọi endpoint auth dạng "làm xong rồi" đều trả `{ message }`. */
export type ApiMessage           = AuthC["schemas"]["ApiMessageResponse"];

// --- Bổ sung: các màn ứng viên (đợt 4) ---
export type InterviewSlot        = InterviewC["schemas"]["InterviewSlotResponse"];
export type CandidateSelfUpdateRequest = CandidateC["schemas"]["CandidateSelfUpdateRequest"];
export type OfferDeclineRequest  = OfferC["schemas"]["OfferDeclineRequest"];
export type RejectionReason      = MasterDataC["schemas"]["RejectionReasonResponse"];
export type EducationLevel       = MasterDataC["schemas"]["EducationLevelResponse"];
export type Pipeline             = MasterDataC["schemas"]["PipelineResponse"];

// --- PageResponse: springdoc sinh ra một type riêng cho MỖI kiểu phần tử ---
export type PageJobPosting       = RecruitmentC["schemas"]["PageResponseJobPostingResponse"];
export type PageApplication      = ApplicationC["schemas"]["PageResponseApplicationResponse"];
export type PageOffer            = OfferC["schemas"]["PageResponseOfferResponse"];

// --- Khu nhân viên: Chuyên viên tuyển dụng (UR) và Đại diện phòng ban (UH) — T2.9, T2.10 ---
export type PageRequisition      = RecruitmentC["schemas"]["PageResponseJobRequisitionResponse"];
export type ApplicationHistory   = ApplicationC["schemas"]["ApplicationHistoryResponse"];
export type ApplicationRejectRequest = ApplicationC["schemas"]["ApplicationRejectRequest"];
export type InterviewerSummary   = InterviewC["schemas"]["InterviewerSummary"];
export type EvaluationSubmitRequest = InterviewC["schemas"]["EvaluationSubmitRequest"];
export type EvaluationDraftRequest = InterviewC["schemas"]["EvaluationDraftRequest"];
export type InterviewHmRejectRequest = InterviewC["schemas"]["InterviewHmRejectRequest"];
export type PipelineStage        = MasterDataC["schemas"]["PipelineStageResponse"];
export type UserProfile          = AuthC["schemas"]["UserProfileResponse"];

/**
 * Điểm AI chi tiết — `GET /v1/ai/scores/{applicationId}` của ai-service (FastAPI).
 * NGOẠI LỆ của quy tắc 1: endpoint này trả `dict` không khai báo schema nên openapi không sinh
 * được type. Chỉ khai đúng những trường màn UR03/UH03 dùng, đối chiếu
 * `ai-service/app/schemas/scoring.py` (ScoredDimension, RequirementResult, ScoreResult).
 * Điểm tổng + xếp loại ở danh sách thì lấy từ `ApplicationResponse.aiScore/aiTier` (có type sinh).
 */
export type AiTier = "FIT" | "UNCLASSIFIED" | "NOT_FIT";
export type AiScoreDetail = {
  applicationId: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  totalScore: number | null;
  tier: AiTier | null;
  scoredAt: string | null;
  result: {
    tier_label: string;
    comment: string;
    summary: string;
    dimensions: { dimension: string; label: string; applicable: boolean; level: number | null; reason: string }[];
    requirements?: { requirement: string; status: string; status_label: string }[];
  } | null;
};

// --- Role + JWT: đã đối chiếu source, KHÔNG đoán lại ---
/**
 * Đúng 4 giá trị của `auth-service/.../enums/RoleName.java`.
 * Chú ý: là COMPANY_ADMIN, KHÔNG phải "ADMIN".
 * Springdoc sinh `role?: string` (không ra enum) nên phải tự khai ở đây.
 */
export type Role = "COMPANY_ADMIN" | "RECRUITER" | "HIRING_MANAGER" | "CANDIDATE";

/**
 * `LoginResponse` CHỈ có accessToken + refreshToken — KHÔNG có role.
 * Role lấy bằng cách giải mã access token (jwt-decode), theo
 * `auth-service/.../security/JwtUtil.java:26-38`.
 */
export type AccessTokenClaims = {
  /** userId, backend ghi bằng String.valueOf(userId) */
  sub: string;
  email: string;
  role: Role;
  /** chỉ có mặt khi user thuộc một phòng ban (HIRING_MANAGER) */
  departmentId?: number;
  iat: number;
  exp: number;
};
