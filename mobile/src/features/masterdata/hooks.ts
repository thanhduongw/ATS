import { useQuery } from "@tanstack/react-query";
import { masterdataApi } from "./api";

/** Masterdata gần như không đổi trong một phiên, nên giữ lâu. */
const STALE = 10 * 60_000;

/** Chỉ lấy nguồn đang bật. */
export const useRecruitmentSources = () =>
  useQuery({
    queryKey: ["masterdata", "recruitment-sources"],
    queryFn: masterdataApi.recruitmentSources,
    staleTime: STALE,
    select: (list) => list.filter((s) => s.active !== false && s.id != null),
  });

export const useRejectionReasons = () =>
  useQuery({
    queryKey: ["masterdata", "rejection-reasons"],
    queryFn: masterdataApi.rejectionReasons,
    staleTime: STALE,
    select: (list) => list.filter((r) => r.active !== false && r.id != null),
  });

export const useEducationLevels = () =>
  useQuery({
    queryKey: ["masterdata", "education-levels"],
    queryFn: masterdataApi.educationLevels,
    staleTime: STALE,
    select: (list) => [...list].sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0)),
  });

/** id → tên nơi làm việc; buổi phỏng vấn chỉ trả `workLocationId`. */
export const useWorkLocationNames = () => {
  const q = useQuery({
    queryKey: ["masterdata", "work-locations"],
    queryFn: masterdataApi.workLocations,
    staleTime: STALE,
  });
  const map = new Map<number, string>();
  for (const l of q.data ?? []) if (l.id != null && l.name) map.set(l.id, l.name);
  return map;
};

/** Các vòng của quy trình tuyển dụng, đã sắp theo thứ tự, bỏ vòng REJECTED (không phải một bước). */
export const usePipelineStages = (id?: number) =>
  useQuery({
    queryKey: ["masterdata", "pipeline", id],
    queryFn: () => masterdataApi.pipeline(id!),
    enabled: id != null,
    staleTime: STALE,
    select: (p) =>
      [...(p.stages ?? [])]
        .filter((st) => st.stageType !== "REJECTED")
        .sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0)),
  });
