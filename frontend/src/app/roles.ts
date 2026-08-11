import type { UserRole } from "../features/auth/types";

export const HR_ROLES: UserRole[] = ["COMPANY_ADMIN", "RECRUITER"];
export const DEPARTMENT_ROLES: UserRole[] = ["HIRING_MANAGER", "INTERVIEWER"];

export const ROLE_LABELS: Record<UserRole, { vi: string; en: string }> = {
    PLATFORM_ADMIN: { vi: "Quản trị nền tảng", en: "Platform Admin" },
    COMPANY_ADMIN: { vi: "Quản trị công ty", en: "Company Admin" },
    RECRUITER: { vi: "HR / Tuyển dụng", en: "HR / Recruiter" },
    HIRING_MANAGER: { vi: "Phòng ban chuyên môn", en: "Hiring Manager" },
    INTERVIEWER: { vi: "Người phỏng vấn", en: "Interviewer" },
    CANDIDATE: { vi: "Ứng viên", en: "Candidate" },
};