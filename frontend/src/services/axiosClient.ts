import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { store } from "../app/store";
import { setCredentials, logout } from "../features/auth/authSlice";
import type { JwtPayload, LoginResponse } from "../features/auth/types";
import { jwtDecode } from "jwt-decode";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const REFRESH_SKEW_MS = 30_000;
const SUPPORTED_ROLES = new Set(["COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER", "CANDIDATE"]);

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string> | null = null;

const redirectToLogin = () => {
    store.dispatch(logout());
    if (window.location.pathname !== "/login") {
        window.location.href = "/login";
    }
};

const isExpiredOrExpiringSoon = (token: string): boolean => {
    try {
        const { email, exp, role, sub } = jwtDecode<JwtPayload>(token);
        if (!sub || Number.isNaN(Number(sub)) || Number(sub) <= 0 || !email || !SUPPORTED_ROLES.has(role)) {
            return true;
        }
        if (!exp) return true;
        return exp * 1000 <= Date.now() + REFRESH_SKEW_MS;
    } catch {
        return true;
    }
};

const refreshAccessToken = async (): Promise<string> => {
    if (refreshPromise) return refreshPromise;

    const { refreshToken } = store.getState().auth;
    if (!refreshToken) {
        redirectToLogin();
        throw new Error("Missing refresh token");
    }

    refreshPromise = axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken }
    )
        .then((res) => {
            store.dispatch(setCredentials(res.data));
            return res.data.accessToken;
        })
        .catch((error) => {
            redirectToLogin();
            throw error;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

export const ensureFreshAccessToken = async (): Promise<string | null> => {
    const { accessToken } = store.getState().auth;
    if (!accessToken) return null;
    if (!isExpiredOrExpiringSoon(accessToken)) return accessToken;
    return refreshAccessToken();
};

// ===== Request interceptor =====
axiosClient.interceptors.request.use(async (config) => {
    const accessToken = await ensureFreshAccessToken();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

// ===== Refresh token queue (tránh race) =====
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// ===== Response interceptor =====
axiosClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableRequestConfig;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Đang refresh → đưa vào hàng đợi
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const newToken = await refreshAccessToken();
                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
