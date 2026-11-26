import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";

/** Đổi mật khẩu — dùng chung cho mọi vai trò (ứng viên, chuyên viên, đại diện phòng ban). */
export const useChangePassword = () => useMutation({ mutationFn: authApi.changePassword });
