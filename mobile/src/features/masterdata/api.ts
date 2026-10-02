import { apiClient } from "@/api/client";
import type { EducationLevel, Pipeline, RecruitmentSource, RejectionReason, WorkLocation } from "@/types/api";

export const masterdataApi = {
  recruitmentSources: () =>
    apiClient.get<RecruitmentSource[]>("/masterdata/recruitment-sources").then((r) => r.data),
  /** Lý do từ chối — dùng cho ứng viên từ chối offer (`declineReasonId`), giống bản web. */
  rejectionReasons: () =>
    apiClient.get<RejectionReason[]>("/masterdata/rejection-reasons").then((r) => r.data),
  educationLevels: () =>
    apiClient.get<EducationLevel[]>("/masterdata/education-levels").then((r) => r.data),
  /** Các vòng tuyển dụng của một tin (khối "Quy trình", canvas N27). Ứng viên gọi được. */
  pipeline: (id: number) => apiClient.get<Pipeline>(`/masterdata/pipelines/${id}`).then((r) => r.data),
  workLocations: () =>
    apiClient.get<WorkLocation[]>("/masterdata/work-locations").then((r) => r.data),
};
