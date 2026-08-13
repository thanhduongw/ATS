package iuh.fit.se.recruitment.common;

import org.springframework.security.access.AccessDeniedException;

import java.util.Set;

public class AccessGuard {

    /** HR + Admin công ty (vận hành tuyển dụng) */
    private static final Set<String> HR_ROLES = Set.of("RECRUITER", "COMPANY_ADMIN");

    /** Phòng ban + HR + Admin — xem / thao tác chung khi cần */
    private static final Set<String> HR_OR_DEPARTMENT = Set.of(
            "RECRUITER", "HIRING_MANAGER", "COMPANY_ADMIN"
    );

    /** @deprecated Dùng requireHr() hoặc requireDepartment() cho rõ nghiệp vụ */
    private static final Set<String> RECRUITER_OR_ABOVE = HR_OR_DEPARTMENT;

    public static void requireRecruiterOrAbove(String role) {
        if (!RECRUITER_OR_ABOVE.contains(role)) {
            throw new AccessDeniedException("Bạn không có quyền thực hiện thao tác này");
        }
    }

    /** Chỉ HR (RECRUITER) hoặc Quản trị công ty */
    public static void requireHr(String role) {
        if (!HR_ROLES.contains(role)) {
            throw new AccessDeniedException("Chỉ HR được thực hiện thao tác này");
        }
    }

    /** Chỉ Phòng ban (HIRING_MANAGER) */
    public static void requireDepartment(String role) {
        if (!"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Chỉ Phòng ban được thực hiện thao tác này");
        }
    }

    /** HR hoặc Phòng ban */
    public static void requireHrOrDepartment(String role) {
        if (!HR_OR_DEPARTMENT.contains(role)) {
            throw new AccessDeniedException("Bạn không có quyền thực hiện thao tác này");
        }
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

    public static boolean isHr(String role) {
        return HR_ROLES.contains(role);
    }

    public static boolean isDepartment(String role) {
        return "HIRING_MANAGER".equals(role);
    }
}