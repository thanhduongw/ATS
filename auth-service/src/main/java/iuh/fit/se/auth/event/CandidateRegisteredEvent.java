package iuh.fit.se.auth.event;

public record CandidateRegisteredEvent(
        Long userId,
        String fullName,
        String email,
        String phone,
        /** Thời điểm ứng viên đồng ý xử lý dữ liệu cá nhân khi đăng ký. */
        java.time.LocalDateTime consentAt
) {}
