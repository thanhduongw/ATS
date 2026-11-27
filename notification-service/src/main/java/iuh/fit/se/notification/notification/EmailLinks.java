package iuh.fit.se.notification.notification;

/**
 * Đường dẫn trên web tới trang liên quan của thông báo — khớp với frontend
 * {@code features/notification/notificationRoutes.ts} (cùng quy tắc khi bấm thông báo trong ứng dụng).
 */
final class EmailLinks {

    private EmailLinks() {}

    record Target(String path, String label) {}

    static Target target(String resourceType, Long id, NotificationType type, boolean candidate) {
        String rt = resourceType == null ? "" : resourceType.toUpperCase();
        String t = type == null ? "" : type.name();
        if (rt.isEmpty()) {
            rt = t.contains("OFFER") ? "OFFER" : t.contains("INTERVIEW") || t.contains("EVALUATION") ? "INTERVIEW"
                    : t.contains("APPLICATION") ? "APPLICATION" : t.contains("REQUISITION") ? "REQUISITION" : "";
        }
        return switch (rt) {
            case "REQUISITION" -> new Target(id != null ? "/recruitment/requisitions?highlightId=" + id : "/recruitment/requisitions",
                    "Xem yêu cầu tuyển dụng");
            case "APPLICATION" -> candidate
                    ? new Target(id != null ? "/my-applications/" + id : "/my-applications", "Xem hồ sơ của bạn")
                    : new Target(id != null ? "/applications?highlightId=" + id : "/applications", "Xem hồ sơ");
            case "INTERVIEW" -> candidate
                    ? new Target(id != null ? "/my-interviews?highlightId=" + id : "/my-interviews", "Xem lịch phỏng vấn")
                    : new Target(id != null ? "/interviews?highlightId=" + id : "/interviews", "Xem lịch phỏng vấn");
            case "OFFER" -> candidate
                    ? new Target(id != null ? "/my-offers/" + id : "/my-offers", "Xem thư mời")
                    : new Target(id != null ? "/offers?highlightId=" + id : "/offers", "Xem thư mời");
            default -> new Target("/notifications", "Mở hệ thống");
        };
    }
}
