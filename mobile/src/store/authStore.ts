import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { tokenStorage } from "@/lib/storage";
import type { AccessTokenClaims, Role } from "@/types/api";

const SUPPORTED_ROLES: ReadonlySet<string> = new Set<Role>([
  "COMPANY_ADMIN",
  "RECRUITER",
  "HIRING_MANAGER",
  "CANDIDATE",
]);

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AccessTokenClaims | null;
  /** Đã đọc xong SecureStore chưa. Điều hướng trước khi cờ này bật sẽ nháy màn login. */
  hydrated: boolean;
  setCredentials: (accessToken: string, refreshToken: string) => Promise<void>;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Giải mã access token. Trả null nếu token hỏng hoặc claim không dùng được —
 * cùng bộ kiểm tra như bản web (`frontend/src/services/axiosClient.ts`).
 */
export const decodeToken = (token: string): AccessTokenClaims | null => {
  try {
    const claims = jwtDecode<AccessTokenClaims>(token);
    const id = Number(claims.sub);
    if (!claims.sub || Number.isNaN(id) || id <= 0) return null;
    if (!claims.email) return null;
    if (!SUPPORTED_ROLES.has(claims.role)) return null;
    if (!claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  async setCredentials(accessToken, refreshToken) {
    await tokenStorage.save(accessToken, refreshToken);
    set({ accessToken, refreshToken, user: decodeToken(accessToken) });
  },

  async hydrate() {
    const { accessToken, refreshToken } = await tokenStorage.read();
    const user = accessToken ? decodeToken(accessToken) : null;

    // Token đọc lên mà hỏng thì coi như chưa đăng nhập, và dọn luôn cho sạch.
    if (accessToken && !user) {
      await tokenStorage.clear();
      set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
      return;
    }

    set({ accessToken, refreshToken, user, hydrated: true });
  },

  async signOut() {
    await tokenStorage.clear();
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));

/** Đọc state trực tiếp, dùng trong interceptor (ngoài vòng đời React). */
export const authState = () => useAuthStore.getState();
