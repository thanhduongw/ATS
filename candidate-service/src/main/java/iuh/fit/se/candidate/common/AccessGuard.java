package iuh.fit.se.candidate.common;

import org.springframework.security.access.AccessDeniedException;

import java.util.Set;

public class AccessGuard {
    private static final Set<String> RECRUITER_OR_ABOVE = Set.of("RECRUITER", "HIRING_MANAGER", "COMPANY_ADMIN");

    public static void requireRecruiterOrAbove(String role) {
        if (!RECRUITER_OR_ABOVE.contains(role)) {
            throw new AccessDeniedException("Bạn không có quyền thực hiện thao tác này");
        }
    }
}