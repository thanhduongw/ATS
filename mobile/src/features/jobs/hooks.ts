import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { jobsApi } from "./api";

export const jobKeys = {
  all: ["jobs"] as const,
  open: () => [...jobKeys.all, "open"] as const,
  detail: (id: number) => [...jobKeys.all, "detail", id] as const,
};

export const useOpenJobs = () => useQuery({ queryKey: jobKeys.open(), queryFn: jobsApi.listOpen });

/** Tên công ty cho dòng "N vị trí đang tuyển tại …" (UC01). */
export const usePublicCompanyName = () =>
  useQuery({ queryKey: [...jobKeys.all, "company"], queryFn: authApi.publicCompany, staleTime: 30 * 60_000, select: (c) => c.name ?? "" });

export const useJob = (id: number) =>
  useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => jobsApi.detail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
