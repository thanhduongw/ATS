package iuh.fit.se.recruitment.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthorizationPolicyTest {

    private static final CurrentUser ADMIN =
            new CurrentUser(1L, "admin@example.com", "COMPANY_ADMIN", null);
    private static final CurrentUser RECRUITER =
            new CurrentUser(2L, "recruiter@example.com", "RECRUITER", 10L);
    private static final CurrentUser HIRING_MANAGER =
            new CurrentUser(3L, "manager@example.com", "HIRING_MANAGER", 10L);
    private static final CurrentUser CANDIDATE =
            new CurrentUser(4L, "candidate@example.com", "CANDIDATE", null);

    @Test
    void candidateCannotPerformAdminOrInternalAction() {
        assertThrows(AccessDeniedException.class,
                () -> AuthorizationPolicy.requireAdmin(CANDIDATE));
        assertThrows(AccessDeniedException.class,
                () -> AuthorizationPolicy.requireInternal(CANDIDATE));
    }

    @Test
    void hiringManagerCannotAccessAnotherDepartment() {
        assertDoesNotThrow(() -> AuthorizationPolicy.requireSameDepartment(HIRING_MANAGER, 10L));
        assertThrows(AccessDeniedException.class,
                () -> AuthorizationPolicy.requireSameDepartment(HIRING_MANAGER, 20L));
    }

    @Test
    void recruiterCanManageEveryDepartment() {
        // HR phu trach tuyen dung toan cong ty, khong con gioi han theo phong ban / nguoi duyet.
        assertTrue(AuthorizationPolicy.canManageJob(RECRUITER, 10L, 99L, 98L));
        assertTrue(AuthorizationPolicy.canManageJob(RECRUITER, 20L, 99L, 2L));
        assertTrue(AuthorizationPolicy.canManageJob(RECRUITER, 20L, 99L, 98L));
    }

    @Test
    void companyAdminCanManageEveryDepartment() {
        assertTrue(AuthorizationPolicy.canManageJob(ADMIN, 999L, 100L, 101L));
        assertDoesNotThrow(() -> AuthorizationPolicy.requireSameDepartment(ADMIN, 999L));
    }

    @Test
    void hiringManagerCanViewSameDepartmentJobWithoutOwningIt() {
        assertTrue(AuthorizationPolicy.canViewJob(HIRING_MANAGER, 10L, 99L));
        assertFalse(AuthorizationPolicy.canViewJob(HIRING_MANAGER, 20L, 99L));
    }

    @Test
    void hiringManagerCannotUseRecruiterApprovalAction() {
        assertThrows(AccessDeniedException.class,
                () -> AuthorizationPolicy.requireHr(HIRING_MANAGER));
    }
}
