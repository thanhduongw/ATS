import type { UserRole } from "../features/auth/types";

export const HR_ROLES: UserRole[] = ["COMPANY_ADMIN", "RECRUITER"];
export const DEPARTMENT_ROLES: UserRole[] = ["HIRING_MANAGER"];

export const ROLE_LABELS: Record<UserRole, { vi: string; en: string }> = {
    COMPANY_ADMIN: { vi: "Quản trị doanh nghiệp", en: "Company Admin" },
    RECRUITER: { vi: "Chuyên viên tuyển dụng", en: "Recruiter" },
    HIRING_MANAGER: { vi: "Quản lý phòng ban", en: "Hiring Manager" },
    CANDIDATE: { vi: "Ứng viên", en: "Candidate" },
};
