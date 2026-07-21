import axiosClient from "../../services/axiosClient";
import type {
    RegisterCompanyRequest,
    VerifyEmailRequest,
    LoginRequest,
    LoginResponse,
    ApiMessageResponse,
} from "./types";

export const registerCompany = (data: RegisterCompanyRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/register-company", data);

export const verifyEmail = (data: VerifyEmailRequest) =>
    axiosClient.post<ApiMessageResponse>("/auth/verify-email", data);

export const login = (data: LoginRequest) =>
    axiosClient.post<LoginResponse>("/auth/login", data);

export const refreshTokenRequest = (refreshToken: string) =>
    axiosClient.post<LoginResponse>("/auth/refresh-token", { refreshToken });

export const logoutRequest = (refreshToken: string) =>
    axiosClient.post<ApiMessageResponse>("/auth/logout", { refreshToken });