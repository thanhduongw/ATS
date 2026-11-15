import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { profileApi } from "./api";

export const profileKeys = { me: ["profile", "me"] as const, account: ["profile", "account"] as const };

export const useMyProfile = () => useQuery({ queryKey: profileKeys.me, queryFn: profileApi.me });

/** Tài khoản đăng nhập (`/auth/me`) — chỉ cần ảnh đại diện; ảnh đổi trên web nên giữ 5 phút. */
export const useMyAccount = () =>
  useQuery({ queryKey: profileKeys.account, queryFn: authApi.me, staleTime: 5 * 60_000 });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profileApi.update,
    onSuccess: (data) => qc.setQueryData(profileKeys.me, data),
  });
};

export const useUploadResume = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profileApi.uploadResume,
    onSuccess: (data) => qc.setQueryData(profileKeys.me, data),
  });
};

export const useRequestDeletion = () => useMutation({ mutationFn: profileApi.requestDeletion });
