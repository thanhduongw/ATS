import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { store } from "../app/store";
import { setCredentials, logout } from "../features/auth/authSlice.ts";
import type { LoginResponse } from "../features/auth/types";

// Mở rộng config của axios để gắn thêm cờ _retry (tránh loop refresh vô hạn)
interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use((config) => {
    const { accessToken } = store.getState().auth;
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableRequestConfig;
        const { refreshToken } = store.getState().auth;

        if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
            originalRequest._retry = true;
            try {
                const res = await axios.post<LoginResponse>(
                    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
                    { refreshToken }
                );
                store.dispatch(setCredentials(res.data));
                originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
                return axiosClient(originalRequest);
            } catch (refreshError) {
                store.dispatch(logout());
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;