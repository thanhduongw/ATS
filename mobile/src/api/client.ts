import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config";
import { authState, decodeToken } from "@/store/authStore";
import type { LoginResponse } from "@/types/api";

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/** Refresh sớm 30 giây để tránh phần lớn vòng 401-rồi-thử-lại trên mạng yếu. */
const REFRESH_SKEW_MS = 30_000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

/**
 * Instance trần cho `/auth/refresh-token`.
 * Nếu gọi refresh bằng chính `apiClient`, interceptor sẽ bắt lại chính nó → đệ quy vô hạn
 * khi token hỏng.
 */
const bare = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

/** Single-flight: mọi request cùng chờ đúng một lời gọi refresh. */
let refreshPromise: Promise<string> | null = null;

/**
 * Springdoc khai accessToken/refreshToken là optional vì record Java không có @NotNull,
 * nhưng backend luôn trả đủ cặp. Chặn ở đây để lỗi hiện ra ngay thay vì lưu `undefined`
 * vào SecureStore rồi 401 ở tận đâu.
 */
const requireTokens = (data: LoginResponse) => {
  if (!data.accessToken || !data.refreshToken) {
    throw new Error("Máy chủ không trả về đủ token đăng nhập");
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
};

const isExpiringSoon = (token: string): boolean => {
  const claims = decodeToken(token);
  if (!claims) return true;
  return claims.exp * 1000 <= Date.now() + REFRESH_SKEW_MS;
};

/**
 * Refresh có single-flight.
 * BẮT BUỘC: backend thu hồi refresh token cũ mỗi lần dùng (LoginService.refreshToken()
 * set revoked = true), nên hai lời gọi song song với cùng một raw token sẽ làm cái thứ hai
 * chết và kéo theo đăng xuất oan.
 */
const refreshTokens = async (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  const { refreshToken, setCredentials, signOut } = authState();
  if (!refreshToken) {
    await signOut();
    throw new Error("Phiên đăng nhập đã hết hạn");
  }

  refreshPromise = bare
    .post<LoginResponse>("/auth/refresh-token", { refreshToken })
    .then(async (res) => {
      // Lưu CẢ HAI token mới. Giữ lại refresh token cũ = lần refresh sau chắc chắn 401.
      const pair = requireTokens(res.data);
      await setCredentials(pair.accessToken, pair.refreshToken);
      return pair.accessToken;
    })
    .catch(async (err) => {
      await signOut();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// ===== Request interceptor: gắn token, refresh trước nếu sắp hết hạn =====
apiClient.interceptors.request.use(async (config) => {
  const { accessToken } = authState();
  if (!accessToken) return config;

  try {
    const token = isExpiringSoon(accessToken) ? await refreshTokens() : accessToken;
    config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // Refresh hỏng → signOut đã chạy trong refreshTokens. Cứ gửi đi không kèm token,
    // backend trả 401 và AuthGate đẩy về màn đăng nhập.
  }
  return config;
});

// ===== Response interceptor: 401 → refresh một lần rồi thử lại =====
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const token = await refreshTokens();
        original.headers.Authorization = `Bearer ${token}`;
        return await apiClient(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Rút thông điệp lỗi tiếng Việt mà backend trả về.
 *
 * Backend có HAI dạng thân lỗi khác nhau — đã kiểm chứng trực tiếp:
 *   1. Lỗi nghiệp vụ:   `{"message": "Email hoac mat khau khong chinh xac"}`
 *   2. Lỗi validation:  `{"password": "Password must contain 8 to 72 characters"}`
 *      — khóa là TÊN TRƯỜNG, và có thể có nhiều trường cùng lúc:
 *        `{"fullName": "...", "email": "..."}`
 * Chỉ đọc `message` thì dạng 2 rơi hết vào câu chung chung, người dùng không biết sai ở đâu.
 */
export const apiErrorMessage = (
  e: unknown,
  fallback = "Có lỗi xảy ra, vui lòng thử lại"
): string => {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as Record<string, unknown> | undefined;

    if (data && typeof data === "object") {
      if (typeof data.message === "string" && data.message) return data.message;
      if (typeof data.error === "string" && data.error) return data.error;

      // Dạng 2: gom câu lỗi của từng trường, mỗi câu một dòng.
      const fieldMessages = Object.values(data).filter(
        (v): v is string => typeof v === "string" && v.length > 0
      );
      if (fieldMessages.length > 0) return fieldMessages.join("\n");
    }

    if (e.code === "ECONNABORTED") return "Máy chủ phản hồi quá chậm, vui lòng thử lại.";
    if (!e.response) return "Không kết nối được máy chủ. Kiểm tra lại mạng.";
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
};

export { requireTokens };
