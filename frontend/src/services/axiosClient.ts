import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { store } from "../app/store";
import { setCredentials, logout } from "../features/auth/authSlice";
import type { LoginResponse } from "../features/auth/types";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// ===== Request interceptor =====
axiosClient.interceptors.request.use((config) => {
    const { accessToken } = store.getState().auth;
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

            const { refreshToken } = store.getState().auth;

            if (!refreshToken) {
                store.dispatch(logout());
                window.location.href = "/login";
                return Promise.reject(error);
            }

            try {
                const res = await axios.post<LoginResponse>(
                    `${API_BASE_URL}/auth/refresh-token`,
                    { refreshToken }
                );

                store.dispatch(setCredentials(res.data));
                const newToken = res.data.accessToken;

                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                store.dispatch(logout());
                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;