import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "./api";

export const jobKeys = {
  all: ["jobs"] as const,
  open: () => [...jobKeys.all, "open"] as const,
  detail: (id: number) => [...jobKeys.all, "detail", id] as const,
};

export const useOpenJobs = () => useQuery({ queryKey: jobKeys.open(), queryFn: jobsApi.listOpen });

export const useJob = (id: number) =>
  useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => jobsApi.detail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
