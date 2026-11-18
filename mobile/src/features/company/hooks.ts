import { useQuery } from "@tanstack/react-query";
import { companyApi } from "./api";
import { defaultCareersConfig, parseCareersConfig } from "./careers-config";

export const companyKeys = {
  all: ["company"] as const,
  profile: () => [...companyKeys.all, "profile"] as const,
  careers: () => [...companyKeys.all, "careers"] as const,
};

/** Quản trị ít khi đổi thông tin công ty → giữ 30 phút, kéo để làm mới ở Trang chủ thì hỏi lại. */
const STALE = 30 * 60_000;

export const usePublicCompany = () =>
  useQuery({ queryKey: companyKeys.profile(), queryFn: companyApi.profile, staleTime: STALE });

/** Cấu hình trang tuyển dụng đã xuất bản, đã ghép mặc định từ hồ sơ công ty (như web). */
export function useCareersConfig() {
  const company = usePublicCompany();
  const page = useQuery({ queryKey: companyKeys.careers(), queryFn: companyApi.careersPage, staleTime: STALE });
  const config = parseCareersConfig(page.data?.publishedConfig, defaultCareersConfig(company.data));
  return {
    config,
    company: company.data,
    // Ảnh đầu trang: ảnh bìa; chưa có thì ảnh đời sống đầu tiên; không có nữa thì chỉ còn chữ trên nền màu (như web).
    coverUrl: config.hero.coverUrl || config.firstPhotoUrl || null,
    refetch: () => Promise.all([company.refetch(), page.refetch()]),
    isRefetching: company.isRefetching || page.isRefetching,
  };
}
