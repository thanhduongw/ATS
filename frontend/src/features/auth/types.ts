
export type UserRole =
    | "PLATFORM_ADMIN"
    | "COMPANY_ADMIN"
    | "RECRUITER"
    | "HIRING_MANAGER"
    | "CANDIDATE";

// ===== Request DTO (khớp record bên Java) =====
export interface RegisterCompanyRequest {
    tenantCode: string;
    companyName: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
}

export interface ResendOtpRequest {
    tenantCode: string;
    email: string;
}

export interface VerifyEmailRequest {
    tenantCode: string;
    email: string;
    otpCode: string;
}

export interface LoginRequest {
    tenantCode: string;
    email: string;
    password: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface ForgotPasswordRequest {
    tenantCode: string;
    email: string;
}

export interface ResetPasswordRequest {
    tenantCode: string;
    email: string;
    otpCode: string;
    newPassword: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface CreateUserRequest {
    email: string;
    fullName: string;
    tempPassword: string;
    role: UserRole;
}

export interface UpdateProfileRequest {
    fullName: string;
}

export interface UpdateCompanyRequest {
    name: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    dataRetentionMonths?: number | null;
}

export interface UpdateUserStatusRequest {
    status: "ACTIVE" | "PENDING_VERIFICATION" | "LOCKED" | "DEACTIVATED";
}

// ===== Response DTO =====
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
}

export interface ApiMessageResponse {
    message: string;
}

export interface UserProfileResponse {
    id: number;
    tenantId: number;
    email: string;
    fullName: string;
    role: UserRole;
    status: string;
}

export interface CompanyResponse {
    id: number;
    tenantId: number;
    name: string;
    tenantCode: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    dataRetentionMonths: number | null;
}

// ===== Payload giải mã từ JWT =====
export interface JwtPayload {
    sub: string; // userId
    tenantId: number;
    role: UserRole;
    iat: number;
    exp: number;
}

// ===== Thông tin user lưu trong Redux =====
export interface AuthUser {
    userId: string;
    tenantId: number;
    role: UserRole;
    email?: string;
    fullName?: string;
}

export interface UserSummaryResponse {
    id: number;
    fullName: string;
    email: string;
    role: UserRole;
    status?: string;
}