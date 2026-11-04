import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { interviewsApi } from "./api";

export const interviewKeys = {
  all: ["interviews"] as const,
  my: () => [...interviewKeys.all, "my"] as const,
};

export const useMyInterviews = () =>
  useQuery({ queryKey: interviewKeys.my(), queryFn: interviewsApi.myList });

export const useConfirmInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: interviewsApi.confirm,
    onSuccess: () => void qc.invalidateQueries({ queryKey: interviewKeys.my() }),
  });
};

/** Xin dời lịch: làm mới lịch và đơn (dòng việc cần làm của đơn đổi theo). */
export const useDeclineInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => interviewsApi.decline(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: interviewKeys.all });
      void qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};
