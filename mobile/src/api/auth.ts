import { apiClient, requireTokens } from "./client";
import type {
  ApiMessage,
  CandidateRegistrationRequest,
  LoginResponse,
  ResetPasswordRequest,
  UserProfileResponse,
} from "@/types/api";

export const authApi = {
  /** Trả về cặp token đã kiểm tra đủ, không còn `string | undefined`. */
  login: (email: string, password: string) =>
    apiClient
      .post<LoginResponse>("/auth/login", { email, password })
      .then((r) => requireTokens(r.data)),

  register: (body: CandidateRegistrationRequest) =>
    apiClient.post<ApiMessage>("/auth/register", body).then((r) => r.data),

  /** Tên trường là `otpCode`, không phải `otp` — đã đối chiếu VerifyEmailRequest. */
  verifyEmail: (email: string, otpCode: string) =>
    apiClient
      .post<ApiMessage>("/auth/verify-email", { email, otpCode })
      .then((r) => r.data),

  resendOtp: (email: string) =>
    apiClient.post<ApiMessage>("/auth/resend-otp", { email }).then((r) => r.data),

  /**
   * Gửi OTP đặt lại mật khẩu.
   * Backend CỐ Ý trả cùng một câu dù email có tồn tại hay không, để không lộ email nào đã
   * đăng ký. Vì vậy giao diện không được khẳng định "đã gửi tới email của bạn".
   */
  forgotPassword: (email: string) =>
    apiClient.post<ApiMessage>("/auth/forgot-password", { email }).then((r) => r.data),

  /** `otpCode` phải đúng 6 chữ số (backend: @Pattern("\d{6}")). */
  resetPassword: (body: ResetPasswordRequest) =>
    apiClient.post<ApiMessage>("/auth/reset-password", body).then((r) => r.data),

  me: () => apiClient.get<UserProfileResponse>("/auth/me").then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post<ApiMessage>("/auth/logout", { refreshToken }).then((r) => r.data),
};
