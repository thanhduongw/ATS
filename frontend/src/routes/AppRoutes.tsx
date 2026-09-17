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
import RecruitmentPage from "../features/recruitment/pages/RecruitmentPage";
import PostingHubPage from "../features/recruitment/pages/PostingHubPage";
import CandidateApplicationDetailPage from "../features/candidate/pages/CandidateApplicationDetailPage";
import ApplicationsPage from "../features/candidate/pages/ApplicationsPage";
import CandidateProfilePage from "../features/candidate/pages/CandidateProfilePage";
import JobsPage from "../features/candidate/pages/JobsPage";
import MyApplicationsPage from "../features/candidate/pages/MyApplicationsPage";
import InterviewCalendar from "../features/interview/components/InterviewCalendar";
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
import JobDetailApplyPage from "../features/public/pages/JobDetailApplyPage";

const INTERNAL_ROLES = ["COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER"] as const;

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
        </Route>

        <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
                <Route index element={<RoleHomeRedirect />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<AuthManagementPage />} />

                <Route element={<RoleRoute allow={[...INTERNAL_ROLES]} />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/recruitment" element={<RecruitmentPage />} />
                    <Route path="/recruitment/requisitions" element={<RecruitmentPage />} />
                    <Route path="/recruitment/postings" element={<RecruitmentPage />} />
                    <Route path="/recruitment/postings/:id" element={<PostingHubPage />} />
                    <Route path="/candidates/:candidateId/applications/:applicationId" element={<CandidateApplicationDetailPage />} />
                    <Route path="/candidates/:candidateId/applications/:applicationId/evaluate" element={<EvaluationFormPage />} />
                    <Route path="/applications" element={<ApplicationsPage />} />
                    <Route path="/interviews" element={<InterviewCalendar />} />
                    <Route path="/evaluations" element={<EvaluationsPage />} />
                    <Route path="/interviews/:interviewId/result" element={<InterviewsPage />} />
                    <Route path="/offers" element={<OffersPage />} />
                </Route>

                {/* Tao va so sanh la thao tac cua HR; chi tiet offer thi moi role noi bo deu xem duoc. */}
                <Route element={<RoleRoute allow={["COMPANY_ADMIN", "RECRUITER"]} />}>
                    <Route path="/offers/compare" element={<CandidateComparisonPage />} />
                    <Route path="/offers/create" element={<OfferCreatePage />} />
                    <Route path="/offers/:id/edit" element={<OfferCreatePage />} />
                </Route>

                <Route element={<RoleRoute allow={[...INTERNAL_ROLES]} />}>
                    <Route path="/offers/:id" element={<OfferDetailPage />} />
                </Route>

                <Route element={<RoleRoute allow={["COMPANY_ADMIN", "RECRUITER"]} />}>
                    <Route path="/masterdata" element={<MasterDataPage />} />
                </Route>

                <Route element={<RoleRoute allow={["COMPANY_ADMIN"]} />}>
                    <Route path="/admin/users" element={<AuthManagementPage initialTab="users" />} />
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
