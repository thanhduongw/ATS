import axiosClient from "../../services/axiosClient";
import type {
    CandidateRegistrationRequest,
    ResendOtpRequest,
    VerifyEmailRequest,
    LoginRequest,
    LoginResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    ApiMessageResponse,
    UserProfileResponse,
    UpdateProfileRequest,
    CompanyResponse,
    InviteUserRequest,
    InvitationPreviewResponse,
    UpdateCompanyRequest,
    UserDirectoryResponse,
    UserSummaryResponse,
    UpdateUserStatusRequest,
    CreateUserRequest,
} from "./types";

export const registerCandidate = (data: CandidateRegistrationRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/register", data);

export const resendOtp = (data: ResendOtpRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/resend-otp", data);

export const verifyEmail = (data: VerifyEmailRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/verify-email", data);

export const login = (data: LoginRequest) =>
    axiosClient.post<LoginResponse>("/auth/login", data);

/** Đổi mã dùng-một-lần (sau khi Google SSO thành công) lấy access/refresh token thật. */
export const exchangeOAuth2Code = (code: string) =>
    axiosClient.post<LoginResponse>("/auth/oauth2/exchange", { code });

export const refreshTokenRequest = (refreshToken: string) =>
    axiosClient.post<LoginResponse>("/auth/refresh-token", { refreshToken });

export const logoutRequest = (refreshToken: string) =>
    axiosClient.post<ApiMessageResponse>("/auth/logout", { refreshToken });

export const forgotPassword = (data: ForgotPasswordRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/forgot-password", data);

export const resetPassword = (data: ResetPasswordRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/reset-password", data);

export const changePassword = (data: ChangePasswordRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/change-password", data);

export const getMyProfile = () =>
    axiosClient.get<UserProfileResponse>("/auth/me");

export const updateMyProfile = (data: UpdateProfileRequest) =>
    axiosClient.put<UserProfileResponse>("/auth/profile", data);

export const getCompany = () =>
    axiosClient.get<CompanyResponse>("/auth/company");

export const updateCompany = (data: UpdateCompanyRequest) =>
    axiosClient.put<CompanyResponse>("/auth/company", data);

/** A04: Quản trị doanh nghiệp mời người dùng qua email (liên kết hiệu lực 7 ngày). */
export const inviteUser = (data: InviteUserRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/admin/invitations", data);

export const resendInvitation = (userId: number) =>
    axiosClient.post<ApiMessageResponse>(`/auth/admin/invitations/${userId}/resend`);

/** Công khai: xem lời mời trước khi đặt mật khẩu. */
export const getInvitation = (token: string) =>
    axiosClient.get<InvitationPreviewResponse>(`/auth/invitations/${encodeURIComponent(token)}`);

export const acceptInvitation = (token: string, password: string) =>
    axiosClient.post<ApiMessageResponse>(`/auth/invitations/${encodeURIComponent(token)}/accept`, { password });

/** Full directory incl. candidates, email and status. COMPANY_ADMIN only on the backend. */
export const getUsers = (role?: string) =>
    axiosClient.get<UserSummaryResponse[]>("/auth/users", { params: role ? { role } : {} });

/** Internal-staff names for assignment pickers. Available to every internal role. */
export const getUserDirectory = (role?: string) =>
    axiosClient.get<UserDirectoryResponse[]>("/auth/users/directory", {
        params: role ? { role } : {},
    });

export const createInternalUser = (data: CreateUserRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/admin/users", data);

export const updateUserStatus = (userId: number, data: UpdateUserStatusRequest) =>
    axiosClient.patch<ApiMessageResponse>(`/auth/users/${userId}/status`, data);
