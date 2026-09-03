package iuh.fit.se.offer.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;

@Component
public class TrustedHeaderAuthenticationFilter extends OncePerRequestFilter {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_EMAIL_HEADER = "X-User-Email";
    public static final String USER_ROLE_HEADER = "X-User-Role";
    public static final String DEPARTMENT_ID_HEADER = "X-Department-Id";

    private static final Set<String> ALLOWED_ROLES = Set.of(
            "COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER", "CANDIDATE"
    );

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String userIdHeader = request.getHeader(USER_ID_HEADER);
        String email = request.getHeader(USER_EMAIL_HEADER);
        String role = request.getHeader(USER_ROLE_HEADER);
        String departmentIdHeader = request.getHeader(DEPARTMENT_ID_HEADER);

        boolean hasIdentityHeader = userIdHeader != null || email != null || role != null || departmentIdHeader != null;
        if (!hasIdentityHeader) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            CurrentUser currentUser = new CurrentUser(
                    parsePositiveLong(userIdHeader, USER_ID_HEADER),
                    requireText(email, USER_EMAIL_HEADER),
                    requireRole(role),
                    departmentIdHeader == null ? null : parsePositiveLong(departmentIdHeader, DEPARTMENT_ID_HEADER)
            );

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    currentUser,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + currentUser.role()))
            );
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            filterChain.doFilter(request, response);
        } catch (IllegalArgumentException ex) {
            SecurityContextHolder.clearContext();
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid trusted user context");
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private Long parsePositiveLong(String value, String headerName) {
        try {
            long parsed = Long.parseLong(value);
            if (parsed <= 0) {
                throw new IllegalArgumentException(headerName + " must be positive");
            }
            return parsed;
        } catch (NumberFormatException | NullPointerException ex) {
            throw new IllegalArgumentException("Invalid " + headerName, ex);
        }
    }

    private String requireText(String value, String headerName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing " + headerName);
        }
        return value;
    }

    private String requireRole(String role) {
        String requiredRole = requireText(role, USER_ROLE_HEADER);
        if (!ALLOWED_ROLES.contains(requiredRole)) {
            throw new IllegalArgumentException("Unsupported role");
        }
        return requiredRole;
    }
}
