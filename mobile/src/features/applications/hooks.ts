import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CandidateApplication } from "@/types/api";
import { applicationsApi, type ApplyRequest } from "./api";

export const applicationKeys = {
  all: ["applications"] as const,
  my: () => [...applicationKeys.all, "my"] as const,
  detail: (id: number) => [...applicationKeys.all, "detail", id] as const,
};

export const useMyApplications = (options?: { enabled?: boolean }) =>
  useQuery({ queryKey: applicationKeys.my(), queryFn: applicationsApi.myList, enabled: options?.enabled });

export const useMyApplication = (id: number) =>
  useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsApi.myDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });

export const useApply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyRequest) => applicationsApi.apply(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: applicationKeys.my() }),
  });
};

/** jobPostingId → id đơn đã nộp. Dùng để gắn nhãn "Đã nộp" ở danh sách và chi tiết tin. */
export function useAppliedJobs() {
  const q = useMyApplications();
  const map = new Map<number, number>();
  for (const a of q.data ?? []) {
    if (a.jobPostingId != null && a.id != null) map.set(a.jobPostingId, a.id);
  }
  return map;
}

/** applicationId → đơn. Buổi PV và thư mời chỉ trả `applicationId`, tên vị trí lấy ở đây. */
export function useApplicationsById() {
  const q = useMyApplications();
  const map = new Map<number, CandidateApplication>();
  for (const a of q.data ?? []) if (a.id != null) map.set(a.id, a);
  return map;
}
