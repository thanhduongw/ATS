package iuh.fit.se.offer.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthorizationPolicyTest {

    @Test
    void companyAdminCanManageAnOfferOwnedByAnotherUser() {
        CurrentUser admin = new CurrentUser(1L, "admin@company.local", "COMPANY_ADMIN", null);

        assertDoesNotThrow(() -> AuthorizationPolicy.requireOwnerOrAdmin(admin, 99L));
        assertDoesNotThrow(() -> AuthorizationPolicy.requireAssignedOrAdmin(admin, 99L));
    }

    @Test
    void recruiterCannotManageAnOfferOwnedByAnotherUser() {
        CurrentUser recruiter = new CurrentUser(2L, "recruiter@company.local", "RECRUITER", 10L);

        assertThrows(AccessDeniedException.class,
                () -> AuthorizationPolicy.requireOwnerOrAdmin(recruiter, 99L));
    }

    @Test
    void assignedActorCanApproveOwnOfferAssignment() {
        CurrentUser manager = new CurrentUser(3L, "manager@company.local", "HIRING_MANAGER", 10L);

        assertDoesNotThrow(() -> AuthorizationPolicy.requireAssignedOrAdmin(manager, 3L));
    }
}
