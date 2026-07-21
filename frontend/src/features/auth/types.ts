// Khớp với RoleName enum bên auth-service (Java)
export type UserRole =
    | "PLATFORM_ADMIN"
    | "COMPANY_ADMIN"
    | "RECRUITER"
    | "HIRING_MANAGER"
    | "INTERVIEWER";

// ===== Request DTO (khớp record bên Java) =====
export interface RegisterCompanyRequest {
    tenantCode: string;
    companyName: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
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

export interface CreateUserRequest {
    email: string;
    fullName: string;
    tempPassword: string;
    role: UserRole;
}

// ===== Response DTO =====
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
}

export interface ApiMessageResponse {
    message: string;
}

// ===== Payload giải mã từ JWT (khớp claim JwtUtil.generateAccessToken bên Java) =====
export interface JwtPayload {
    sub: string; // userId
    tenantId: number;
    role: UserRole;
    iat: number;
    exp: number;
}

// ===== Thông tin user lưu trong Redux, decode sẵn từ JWT =====
export interface AuthUser {
    userId: string;
    tenantId: number;
    role: UserRole;
}