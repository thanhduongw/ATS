package iuh.fit.se.auth.dto.response;

public record UserProfileResponse(
        Long id,
        Long tenantId,
        String email,
        String fullName,
        String role,
        String status
) {}
