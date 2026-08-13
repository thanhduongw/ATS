package iuh.fit.se.interview.common;

import org.springframework.security.access.AccessDeniedException;

import java.util.Set;

public class AccessGuard {

    private static final Set<String> HR_ROLES = Set.of("RECRUITER", "COMPANY_ADMIN");
    private static final Set<String> HR_OR_DEPARTMENT =
            Set.of("RECRUITER", "COMPANY_ADMIN", "HIRING_MANAGER");

    public static void requireHr(String role) {
        if (!HR_ROLES.contains(role)) {
            throw new AccessDeniedException("Chỉ HR được thực hiện thao tác này");
        }
    }

    public static void requireHrOrDepartment(String role) {
        if (!HR_OR_DEPARTMENT.contains(role)) {
            throw new AccessDeniedException("Bạn không có quyền thực hiện thao tác này");
        }
    }

    /** @deprecated dùng requireHr / requireHrOrDepartment */
    public static void requireRecruiterOrAbove(String role) {
        requireHrOrDepartment(role);
    }

    public static void requireCandidate(String role) {
        if (!"CANDIDATE".equals(role)) {
            throw new AccessDeniedException("Chỉ ứng viên được thực hiện thao tác này");
        }
    }

    public static boolean isHr(String role) {
        return HR_ROLES.contains(role);
    }

    public static boolean isDepartment(String role) {
        return "HIRING_MANAGER".equals(role);
    }

    public static boolean isCandidate(String role) {
        return "CANDIDATE".equals(role);
    }
}