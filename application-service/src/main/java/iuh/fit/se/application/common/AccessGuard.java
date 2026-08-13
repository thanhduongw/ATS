package iuh.fit.se.application.common;

import org.springframework.security.access.AccessDeniedException;

import java.util.Set;

public class AccessGuard {

    private static final Set<String> HR_ROLES = Set.of("RECRUITER", "COMPANY_ADMIN");
    private static final Set<String> HR_OR_DEPARTMENT =
            Set.of("RECRUITER", "COMPANY_ADMIN", "HIRING_MANAGER");
    /** SYSTEM: Feign nội bộ (offer-service advance sau accept). */
    private static final Set<String> RECRUITER_OR_ABOVE =
            Set.of("RECRUITER", "HIRING_MANAGER", "COMPANY_ADMIN", "SYSTEM");

    public static void requireRecruiterOrAbove(String role) {
        if (!RECRUITER_OR_ABOVE.contains(role)) {
            throw new AccessDeniedException("Bạn không có quyền thực hiện thao tác này");
        }
    }

    public static void requireHr(String role) {
        if (!HR_ROLES.contains(role) && !"SYSTEM".equals(role)) {
            throw new AccessDeniedException("Chỉ HR được thực hiện thao tác này");
        }
    }

    public static void requireHrOrDepartment(String role) {
        if (!HR_OR_DEPARTMENT.contains(role) && !"SYSTEM".equals(role)) {
            throw new AccessDeniedException("Bạn không có quyền thực hiện thao tác này");
        }
    }

    public static void requireCandidate(String role) {
        if (!"CANDIDATE".equals(role)) {
            throw new AccessDeniedException("Chỉ ứng viên được thực hiện thao tác này");
        }
    }

    public static boolean isHr(String role) {
        return HR_ROLES.contains(role);
    }

    public static boolean isCandidate(String role) {
        return "CANDIDATE".equals(role);
    }

    public static boolean isDepartment(String role) {
        return "HIRING_MANAGER".equals(role);
    }

    public static void requireOwner(Long ownerId, Long currentUserId) {
        if (!ownerId.equals(currentUserId)) {
            throw new AccessDeniedException("Chỉ người tạo mới được thực hiện thao tác này");
        }
    }

    public static void requireApprover(Long approverId, Long currentUserId) {
        if (!approverId.equals(currentUserId)) {
            throw new AccessDeniedException("Chỉ người được chỉ định duyệt mới được thực hiện thao tác này");
        }
    }
}