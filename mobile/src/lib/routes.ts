import type { Role } from "@/types/api";

/** Bản đồ DUY NHẤT quyết định role nào vào khu vực nào. Sửa điều hướng thì sửa ở đây. */
export const homeForRole = (role?: Role | string) => {
  switch (role) {
    case "CANDIDATE":
      return "/(candidate)/jobs";
    case "HIRING_MANAGER":
      return "/(hm)";
    case "RECRUITER":
    case "COMPANY_ADMIN":
      return "/(hr)";
    default:
      return "/(auth)/login";
  }
};
