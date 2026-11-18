import { apiClient } from "@/api/client";
import type { CompanyResponse } from "@/types/api";
import type { components as AuthC } from "@/types/generated/auth";

type CareersPageResponse = AuthC["schemas"]["CareersPageResponse"];

/** API công khai của doanh nghiệp — đọc những gì Quản trị đặt trên web (A08, A09/A10). Không cần đăng nhập. */
export const companyApi = {
  /** Tên, logo, ảnh bìa (`bannerUrl`), khẩu hiệu… */
  profile: () => apiClient.get<CompanyResponse>("/auth/public/company").then((r) => r.data),
  /** Trang tuyển dụng đã xuất bản: `publishedConfig` là CHUỖI JSON — đọc bằng `parseCareersConfig`. */
  careersPage: () => apiClient.get<CareersPageResponse>("/auth/public/careers-page").then((r) => r.data),
};
