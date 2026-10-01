import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { interviewsApi } from "./api";

export const interviewKeys = {
  all: ["interviews"] as const,
  my: () => [...interviewKeys.all, "my"] as const,
  pendingSlots: () => [...interviewKeys.all, "pending-slots"] as const,
};

export const useMyInterviews = () =>
  useQuery({ queryKey: interviewKeys.my(), queryFn: interviewsApi.myList });

export const useMyPendingSlots = () =>
  useQuery({ queryKey: interviewKeys.pendingSlots(), queryFn: interviewsApi.myPendingSlots });

export const useConfirmInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: interviewsApi.confirm,
    onSuccess: () => void qc.invalidateQueries({ queryKey: interviewKeys.my() }),
  });
};

export const useMarkSlotAvailable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: interviewsApi.markSlotAvailable,
    onSuccess: () => void qc.invalidateQueries({ queryKey: interviewKeys.pendingSlots() }),
  });
};
