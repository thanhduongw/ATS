import { Navigate, Route, Routes } from "react-router-dom";
import GuestRoute from "../components/GuestRoute";
import ProtectedRoute from "../components/ProtectedRoute";
import RoleHomeRedirect from "../components/RoleHomeRedirect";
import RoleRoute from "../components/RoleRoute";
import AppLayout from "../layouts/AppLayout";
import PublicLayout from "../layouts/PublicLayout";
import RegisterPage from "../features/auth/pages/RegisterPage";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage";
import LoginPage from "../features/auth/pages/LoginPage";
import OAuth2CallbackPage from "../features/auth/pages/OAuth2CallbackPage";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import AuthManagementPage from "../features/auth/pages/AuthManagementPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import MasterDataPage from "../features/masterdata/pages/MasterDataPage";
import CatalogDetailPage from "../features/masterdata/pages/CatalogDetailPage";
import RecruitmentPage from "../features/recruitment/pages/RecruitmentPage";
import PostingHubPage from "../features/recruitment/pages/PostingHubPage";
import CandidateApplicationDetailPage from "../features/candidate/pages/CandidateApplicationDetailPage";
import ApplicationsPage from "../features/candidate/pages/ApplicationsPage";
import CandidateProfilePage from "../features/candidate/pages/CandidateProfilePage";
import JobsPage from "../features/candidate/pages/JobsPage";
import MyApplicationsPage from "../features/candidate/pages/MyApplicationsPage";
import InterviewSchedulePage from "../features/interview/pages/InterviewSchedulePage";
import EvaluationsPage from "../features/interview/pages/EvaluationsPage";
import InterviewsPage from "../features/interview/pages/InterviewsPage";
import EvaluationFormPage from "../features/interview/pages/EvaluationFormPage";
import CandidateInterviewsPage from "../features/interview/pages/CandidateInterviewsPage";
import OffersPage from "../features/offer/pages/OffersPage";
import CandidateOffersPage from "../features/offer/pages/CandidateOffersPage";
import CandidateComparisonPage from "../features/offer/pages/CandidateComparisonPage";
import OfferCreatePage from "../features/offer/pages/OfferCreatePage";
import OfferDetailPage from "../features/offer/pages/OfferDetailPage";
import OfferCandidateViewPage from "../features/offer/pages/OfferCandidateViewPage";
import AuditLogPage from "../features/auditlog/pages/AuditLogPage";
import NotificationsPage from "../features/notification/pages/NotificationsPage";
import CompanyJobsPage from "../features/public/pages/CompanyJobsPage";
import UsersPage from "../features/admin/pages/UsersPage";
import InviteUserPage from "../features/admin/pages/InviteUserPage";
import RolesPage from "../features/admin/pages/RolesPage";
import UserDetailPage from "../features/admin/pages/UserDetailPage";
import CompanyPage from "../features/admin/pages/CompanyPage";
import AcceptInvitePage from "../features/auth/pages/AcceptInvitePage";
import MyWorkPage from "../features/home/pages/MyWorkPage";
import RequisitionDetailPage from "../features/recruitment/pages/RequisitionDetailPage";
import RequisitionFormPage from "../features/recruitment/pages/RequisitionFormPage";
import ResultsPage from "../features/results/pages/ResultsPage";
import PositionResultPage from "../features/results/pages/PositionResultPage";
import JobDetailApplyPage from "../features/public/pages/JobDetailApplyPage";

const INTERNAL_ROLES = ["COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER"] as const;

/**
 * Vai trò vận hành tuyển dụng (ứng viên, phỏng vấn, thư mời…).
 * Theo thiết kế docs/UI (A07, DS06) Quản trị doanh nghiệp chỉ xem số liệu tổng hợp, không mở hồ sơ ứng viên.
 * NỢ KỸ THUẬT (quyết định C1 = phương án 2): mới chặn ở giao diện; backend vẫn cho COMPANY_ADMIN đọc
 * các API này (application-service/.../security/AuthorizationPolicy.java:22-40).
 */
const OPERATION_ROLES = ["RECRUITER", "HIRING_MANAGER"] as const;

export default function AppRoutes() {
    return <Routes>
        <Route path="/careers" element={<PublicLayout />}>
            <Route index element={<CompanyJobsPage />} />
            <Route path="jobs/:jobId" element={<JobDetailApplyPage />} />
        </Route>

        <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />
            {/* Nhận lời mời từ email A04 — người được mời chưa đăng nhập. */}
            <Route path="/invite/:token" element={<AcceptInvitePage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
                <Route index element={<RoleHomeRedirect />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<AuthManagementPage />} />

                <Route element={<RoleRoute allow={[...INTERNAL_ROLES]} />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                </Route>

                <Route element={<RoleRoute allow={[...OPERATION_ROLES]} />}>
                    {/* R01 / H01 "Việc của tôi" */}
                    <Route path="/my-work" element={<MyWorkPage />} />
                    <Route path="/recruitment" element={<RecruitmentPage />} />
                    <Route path="/recruitment/requisitions" element={<RecruitmentPage />} />
                    <Route path="/recruitment/requisitions/:id" element={<RequisitionDetailPage />} />
                    <Route path="/recruitment/postings" element={<RecruitmentPage />} />
                    <Route path="/recruitment/postings/:id" element={<PostingHubPage />} />
                    <Route path="/candidates/:candidateId/applications/:applicationId" element={<CandidateApplicationDetailPage />} />
                    <Route path="/candidates/:candidateId/applications/:applicationId/evaluate" element={<EvaluationFormPage />} />
                    <Route path="/applications" element={<ApplicationsPage />} />
                    <Route path="/interviews" element={<InterviewSchedulePage />} />
                    <Route path="/evaluations" element={<EvaluationsPage />} />
                    <Route path="/interviews/:interviewId/result" element={<InterviewsPage />} />
                    <Route path="/offers" element={<OffersPage />} />
                </Route>

                {/* H05: chỉ Đại diện phòng ban tạo / sửa yêu cầu tuyển dụng. */}
                <Route element={<RoleRoute allow={["HIRING_MANAGER"]} />}>
                    <Route path="/recruitment/requisitions/new" element={<RequisitionFormPage />} />
                    <Route path="/recruitment/requisitions/:id/edit" element={<RequisitionFormPage />} />
                    {/* H16, H17: Kết quả tuyển dụng của phòng (không có lương). */}
                    <Route path="/results" element={<ResultsPage />} />
                    <Route path="/results/:id" element={<PositionResultPage />} />
                </Route>

                {/* Tao va so sanh la thao tac cua HR; chi tiet offer thi moi role noi bo deu xem duoc. */}
                <Route element={<RoleRoute allow={["RECRUITER"]} />}>
                    <Route path="/offers/compare" element={<CandidateComparisonPage />} />
                    <Route path="/offers/create" element={<OfferCreatePage />} />
                    <Route path="/offers/:id/edit" element={<OfferCreatePage />} />
                </Route>

                <Route element={<RoleRoute allow={[...OPERATION_ROLES]} />}>
                    <Route path="/offers/:id" element={<OfferDetailPage />} />
                </Route>

                {/* A07: chỉ Chuyên viên tuyển dụng sửa danh mục. */}
                <Route element={<RoleRoute allow={["RECRUITER"]} />}>
                    <Route path="/masterdata" element={<MasterDataPage />} />
                    <Route path="/masterdata/:key" element={<CatalogDetailPage />} />
                </Route>

                <Route element={<RoleRoute allow={["COMPANY_ADMIN"]} />}>
                    <Route path="/admin/users" element={<UsersPage />} />
                    <Route path="/admin/users/invite" element={<InviteUserPage />} />
                    <Route path="/admin/users/roles" element={<RolesPage />} />
                    <Route path="/admin/users/:id" element={<UserDetailPage />} />
                    <Route path="/admin/company" element={<CompanyPage />} />
                    <Route path="/audit-logs" element={<AuditLogPage />} />
                </Route>

                <Route element={<RoleRoute allow={["CANDIDATE"]} />}>
                    <Route path="/my-profile" element={<CandidateProfilePage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/my-applications" element={<MyApplicationsPage />} />
                    <Route path="/my-interviews" element={<CandidateInterviewsPage />} />
                    <Route path="/my-offers" element={<CandidateOffersPage />} />
                    <Route path="/my-offers/:id" element={<OfferCandidateViewPage />} />
                </Route>
            </Route>
        </Route>

        <Route path="/" element={<Navigate to="/careers" replace />} />
        <Route path="*" element={<Navigate to="/careers" replace />} />
    </Routes>;
}
