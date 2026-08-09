import { Routes, Route, Navigate } from "react-router-dom";
import GuestRoute from "../components/GuestRoute";
import RegisterPage from "../features/auth/pages/RegisterPage";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage";
import LoginPage from "../features/auth/pages/LoginPage";
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import DashboardPage from "../pages/DashboardPage";
import MasterDataPage from "../features/masterdata/pages/MasterDataPage";
import ProtectedRoute from "../components/ProtectedRoute";
import RecruitmentPage from "../features/recruitment/pages/RecruitmentPage";
import CandidatesPage from "../features/candidate/pages/CandidatesPage";
import ApplicationsPage from "../features/candidate/pages/ApplicationsPage";
import InterviewsPage from "../features/interview/pages/InterviewsPage";
import OffersPage from "../features/offer/pages/OffersPage";
import AppLayout from "../layouts/AppLayout";
import AuditLogPage from "../features/auditlog/pages/AuditLogPage";

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
                    <Route path="/masterdata" element={<MasterDataPage />} />
                    <Route path="/recruitment" element={<RecruitmentPage />} />
                    <Route path="/candidates" element={<CandidatesPage />} />
                    <Route path="/applications" element={<ApplicationsPage />} />
                    <Route path="/interviews" element={<InterviewsPage />} />
                    <Route path="/offers" element={<OffersPage />} />
                    <Route path="/audit-logs" element={<AuditLogPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}