import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

/**
 * Đăng xuất: báo backend thu hồi refresh token (hỏng cũng vẫn đăng xuất phía máy), xóa token,
 * và xóa cache dữ liệu để người đăng nhập sau không thấy đơn/thư mời của người trước.
 */
export function useSignOut() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const signOut = useAuthStore((s) => s.signOut);
  const qc = useQueryClient();

  return async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // bỏ qua có chủ đích
    }
    qc.clear();
    await signOut();
  };
}
