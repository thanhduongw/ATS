import { Routes, Route, Navigate } from "react-router-dom";
import GuestRoute from "../components/GuestRoute";
import ProtectedRoute from "../components/ProtectedRoute";
import RoleRoute from "../components/RoleRoute";
import AppLayout from "../layouts/AppLayout";
import RegisterPage from "../features/auth/pages/RegisterPage";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage";
import LoginPage from "../features/auth/pages/LoginPage";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import DashboardPage from "../pages/DashboardPage";
import MasterDataPage from "../features/masterdata/pages/MasterDataPage";
import RecruitmentPage from "../features/recruitment/pages/RecruitmentPage";
import CandidatesPage from "../features/candidate/pages/CandidatesPage";
import ApplicationsPage from "../features/candidate/pages/ApplicationsPage";
import InterviewsPage from "../features/interview/pages/InterviewsPage";
import InterviewSchedulingPage from "../features/interview/pages/InterviewSchedulingPage";
import OffersPage from "../features/offer/pages/OffersPage";
import OfferCandidateViewPage from "../features/offer/pages/OfferCandidateViewPage";
import AuditLogPage from "../features/auditlog/pages/AuditLogPage";
import { HR_ROLES, DEPARTMENT_ROLES } from "../app/roles";
import InterviewResultPage from "../features/interview/pages/InterviewsPage";

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<GuestRoute />}>
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />

                    <Route element={<RoleRoute allow={[...HR_ROLES]} />}>
                        <Route path="/masterdata" element={<MasterDataPage />} />
                        <Route path="/candidates" element={<CandidatesPage />} />
                        <Route path="/offers" element={<OffersPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={[...HR_ROLES, ...DEPARTMENT_ROLES]} />}>
                        <Route path="/recruitment" element={<RecruitmentPage />} />
                        <Route path="/interviews" element={<InterviewsPage />} />
                        <Route path="/interviews/:interviewId/result" element={<InterviewResultPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={[...HR_ROLES, ...DEPARTMENT_ROLES, "CANDIDATE"]} />}>
                        <Route path="/scheduling" element={<InterviewSchedulingPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={["CANDIDATE"]} />}>
                        <Route path="/applications" element={<ApplicationsPage />} />
                        <Route path="/offers/:id/view" element={<OfferCandidateViewPage />} />
                    </Route>

                    <Route element={<RoleRoute allow={["COMPANY_ADMIN", "PLATFORM_ADMIN"]} />}>
                        <Route path="/audit-logs" element={<AuditLogPage />} />
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}