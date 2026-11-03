export type UserRole =
    | "COMPANY_ADMIN"
    | "RECRUITER"
    | "HIRING_MANAGER"
    | "CANDIDATE";

export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "LOCKED" | "INACTIVE";

export interface CandidateRegistrationRequest {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string | null;
}

export interface ResendOtpRequest { email: string; }
export interface VerifyEmailRequest { email: string; otpCode: string; }
export interface LoginRequest { email: string; password: string; }
export interface RefreshTokenRequest { refreshToken: string; }
export interface ForgotPasswordRequest { email: string; }
export interface ResetPasswordRequest { email: string; otpCode: string; newPassword: string; }
export interface ChangePasswordRequest { currentPassword: string; newPassword: string; }

export interface CreateUserRequest {
    email: string;
    fullName: string;
    tempPassword: string;
    role: Exclude<UserRole, "CANDIDATE">;
    phone?: string | null;
    departmentId?: number | null;
    status: "ACTIVE" | "INACTIVE";
}

export interface UpdateProfileRequest { fullName: string; phone?: string | null; }

/** docs/UI A08, C01 (quyết định C4, Q7). */
export interface CompanyProfileFields {
    address?: string | null;
    phone?: string | null;
    legalName?: string | null;
    taxCode?: string | null;
    foundedDate?: string | null;
    website?: string | null;
    sizeRange?: string | null;
    recruitingEmail?: string | null;
    brandColor?: string | null;
    dataProtectionOfficerId?: number | null;
    privacyPolicy?: string | null;
    tagline?: string | null;
    /** JSON: [{"title": "...", "description": "..."}]. */
    benefits?: string | null;
}

export interface UpdateCompanyRequest extends CompanyProfileFields {
    name: string;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    dataRetentionMonths?: number | null;
}

/** docs/UI A04 "Mời người dùng". */
export interface InviteUserRequest {
    fullName: string;
    email: string;
    role: Exclude<UserRole, "CANDIDATE">;
    departmentId?: number | null;
    jobTitle?: string | null;
    message?: string | null;
}

export interface InvitationPreviewResponse {
    email: string;
    fullName: string;
    roleName: UserRole | null;
    departmentId: number | null;
    jobTitle: string | null;
    invitedByName: string;
    message: string | null;
    expiresAt: string;
}

export interface UpdateUserStatusRequest { status: UserStatus; }
export interface LoginResponse { accessToken: string; refreshToken: string; }
export interface ApiMessageResponse { message: string; }

export interface UserProfileResponse {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    role: UserRole;
    departmentId: number | null;
    status: UserStatus;
    emailVerified: boolean;
}

export interface CompanyResponse extends CompanyProfileFields {
    id: number;
    name: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    dataRetentionMonths: number | null;
    privacyPolicyUpdatedAt?: string | null;
}

export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    departmentId?: number;
    iat: number;
    exp: number;
}

export interface AuthUser {
    userId: string;
    email: string;
    role: UserRole;
    departmentId: number | null;
    fullName?: string;
}

/** Internal-staff picker entry from GET /auth/users/directory. No email or account status. */
export interface UserDirectoryResponse {
    id: number;
    fullName: string;
    role: UserRole;
    departmentId: number | null;
}

export interface UserSummaryResponse {
    id: number;
    fullName: string;
    email: string;
    role: UserRole;
    departmentId: number | null;
    status: UserStatus;
    /** docs/UI A03 "Đăng nhập gần nhất". */
    lastLoginAt?: string | null;
}
