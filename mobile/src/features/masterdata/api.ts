import { apiClient } from "@/api/client";
import type { RecruitmentSource } from "@/types/api";

export const masterdataApi = {
  recruitmentSources: () =>
    apiClient.get<RecruitmentSource[]>("/masterdata/recruitment-sources").then((r) => r.data),
};
