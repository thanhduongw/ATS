import { Routes, Route, Navigate } from "react-router-dom";
import GuestRoute from "../components/GuestRoute";
import ProtectedRoute from "../components/ProtectedRoute";
import RoleRoute from "../components/RoleRoute";
import AppLayout from "../layouts/AppLayout";
import PublicLayout from "../layouts/PublicLayout";
import RegisterPage from "../features/auth/pages/RegisterPage";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage";
import LoginPage from "../features/auth/pages/LoginPage";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import MasterDataPage from "../features/masterdata/pages/MasterDataPage";
import RecruitmentPage from "../features/recruitment/pages/RecruitmentPage";
import CandidatesPage from "../features/candidate/pages/CandidatesPage";
import ApplicationsPage from "../features/candidate/pages/ApplicationsPage";
import InterviewsPage from "../features/interview/pages/InterviewsPage";
import InterviewSchedulingPage from "../features/interview/pages/InterviewSchedulingPage";
import OffersPage from "../features/offer/pages/OffersPage";
import OfferCandidateViewPage from "../features/offer/pages/OfferCandidateViewPage";
import MyApplicationsPage from "../features/candidate/pages/MyApplicationsPage";
import AuditLogPage from "../features/auditlog/pages/AuditLogPage";
import AuthManagementPage from "../features/auth/pages/AuthManagementPage";
import { HR_ROLES, DEPARTMENT_ROLES } from "../app/roles";
import JobsPage from "../features/candidate/pages/JobsPage";
import NotificationsPage from "../features/notification/pages/NotificationsPage";
import CompanyJobsPage from "../features/public/pages/CompanyJobsPage";
import JobDetailApplyPage from "../features/public/pages/JobDetailApplyPage";

export default function AppRoutes() {
    return (
        <Routes>
            {/* ===== Public Career Portal (không cần login) ===== */}
            <Route path="/c/:tenantCode" element={<PublicLayout />}>
                <Route index element={<CompanyJobsPage />} />
                <Route path="jobs/:jobId" element={<JobDetailApplyPage />} />
            </Route>

            {/* ===== Guest (auth pages) ===== */}
            <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* ===== Protected (nội bộ) ===== */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />

                    <Route element={<RoleRoute allow={[...HR_ROLES]} />}>
                        <Route path="/masterdata" element={<MasterDataPage />} />
                        <Route path="/candidates" element={<CandidatesPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={[...HR_ROLES, ...DEPARTMENT_ROLES]} />}>
                        <Route path="/recruitment" element={<RecruitmentPage />} />
                        <Route path="/applications" element={<ApplicationsPage />} />
                        <Route path="/interviews" element={<InterviewsPage />} />
                        <Route path="/interviews/:interviewId/result" element={<InterviewsPage />} />
                        <Route path="/offers" element={<OffersPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={[...HR_ROLES, ...DEPARTMENT_ROLES, "CANDIDATE"]} />}>
                        <Route path="/scheduling" element={<InterviewSchedulingPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={["CANDIDATE"]} />}>
                        <Route path="/jobs" element={<JobsPage />} />
                        <Route path="/my-applications" element={<MyApplicationsPage />} />
                        <Route path="/offers/candidate/:id" element={<OfferCandidateViewPage />} />
                        <Route path="/offers/:id/view" element={<OfferCandidateViewPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={["COMPANY_ADMIN", "PLATFORM_ADMIN"]} />}>
                        <Route path="/audit-logs" element={<AuditLogPage />} />
                    </Route>

                    <Route path="/settings" element={<AuthManagementPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}