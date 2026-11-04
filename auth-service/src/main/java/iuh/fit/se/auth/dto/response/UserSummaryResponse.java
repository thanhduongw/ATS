package iuh.fit.se.auth.dto.response;

public record UserSummaryResponse(
        Long id,
        String fullName,
        String email,
        String role,
        Long departmentId,
        String status,
        /** docs/UI A03 "Đăng nhập gần nhất"; null = chưa đăng nhập lần nào. */
        java.time.LocalDateTime lastLoginAt
) {}
