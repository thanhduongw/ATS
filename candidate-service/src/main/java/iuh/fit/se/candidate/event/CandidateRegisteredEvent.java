package iuh.fit.se.candidate.event;

public record CandidateRegisteredEvent(
        Long userId,
        String fullName,
        String email,
        String phone,
        /** Thời điểm ứng viên đồng ý xử lý dữ liệu cá nhân khi đăng ký; null với sự kiện cũ. */
        java.time.LocalDateTime consentAt
) {}
