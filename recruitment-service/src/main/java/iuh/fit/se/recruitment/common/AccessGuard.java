package iuh.fit.se.recruitment.common;

import org.springframework.security.access.AccessDeniedException;

import java.util.Set;

public class AccessGuard {

    private static final Set<String> RECRUITER_OR_ABOVE = Set.of("RECRUITER", "HIRING_MANAGER", "COMPANY_ADMIN");

    public static void requireRecruiterOrAbove(String role) {
        if (!RECRUITER_OR_ABOVE.contains(role)) {
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
}