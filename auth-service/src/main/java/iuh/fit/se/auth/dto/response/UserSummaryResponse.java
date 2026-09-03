package iuh.fit.se.auth.dto.response;

public record UserSummaryResponse(
        Long id,
        String fullName,
        String email,
        String role,
        Long departmentId,
        String status
) {}
