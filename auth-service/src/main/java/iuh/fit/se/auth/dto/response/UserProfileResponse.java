package iuh.fit.se.auth.dto.response;

public record UserProfileResponse(
        Long id,
        String email,
        String fullName,
        String phone,
        String role,
        Long departmentId,
        String status,
        boolean emailVerified
) {}
