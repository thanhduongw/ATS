import type { UserRole } from "../features/auth/types";

export const HR_ROLES: UserRole[] = ["COMPANY_ADMIN", "RECRUITER"];
export const DEPARTMENT_ROLES: UserRole[] = ["HIRING_MANAGER"];

export const ROLE_LABELS: Record<UserRole, { vi: string; en: string }> = {
    PLATFORM_ADMIN: { vi: "Quản trị viên nền tảng", en: "Platform Admin" },
    COMPANY_ADMIN: { vi: "Quản trị viên công ty", en: "Company Admin" },
    RECRUITER: { vi: "HR", en: "HR" },
    HIRING_MANAGER: { vi: "Phòng ban", en: "Department" },
    CANDIDATE: { vi: "Ứng viên", en: "Candidate" },
};