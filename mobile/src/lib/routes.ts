import type { Role } from "@/types/api";

/** Bản đồ DUY NHẤT quyết định role nào vào khu vực nào. Sửa điều hướng thì sửa ở đây. */
export const homeForRole = (role?: Role | string) => {
  switch (role) {
    case "CANDIDATE":
      return "/(candidate)/home";
    case "HIRING_MANAGER":
      return "/hm";
    case "RECRUITER":
      return "/hr";
    // COMPANY_ADMIN không dùng app (chỉ web) → rơi xuống default, về màn đăng nhập.
    default:
      return "/(auth)/login";
  }
};
