import { useQuery } from "@tanstack/react-query";
import { masterdataApi } from "./api";

/** Masterdata gần như không đổi trong một phiên, nên giữ lâu. Chỉ lấy nguồn đang bật. */
export const useRecruitmentSources = () =>
  useQuery({
    queryKey: ["masterdata", "recruitment-sources"],
    queryFn: masterdataApi.recruitmentSources,
    staleTime: 10 * 60_000,
    select: (list) => list.filter((s) => s.active !== false && s.id != null),
  });
