package iuh.fit.se.dashboard.security;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public record CurrentUser(Long userId, String email, String role, Long departmentId) {

    public static CurrentUser required() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CurrentUser currentUser) {
            return currentUser;
        }
        throw new AuthenticationCredentialsNotFoundException("Authenticated user context is required");
    }
}
