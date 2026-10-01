import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "./api";

export const profileKeys = { me: ["profile", "me"] as const };

export const useMyProfile = () => useQuery({ queryKey: profileKeys.me, queryFn: profileApi.me });

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
