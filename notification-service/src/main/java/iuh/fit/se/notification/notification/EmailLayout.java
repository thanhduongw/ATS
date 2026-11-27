package iuh.fit.se.notification.notification;

import java.util.regex.Pattern;

/**
 * Khung HTML chung cho mọi email thông báo: đầu thư mang tên / logo và màu thương hiệu công ty, nội dung,
 * nút dẫn tới trang liên quan, chân thư. Nội dung mẫu (do Quản trị soạn) là văn bản thường: được escape,
 * đoạn cách nhau bằng dòng trống, xuống dòng giữ nguyên. Dùng bảng + style inline để hiển thị đúng trên
 * Gmail / Outlook.
 */
public final class EmailLayout {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");
    static final String DEFAULT_COLOR = "#1F5EFF";

    private EmailLayout() {}

    /** Thông tin công ty dùng ở đầu và chân thư. */
    public record Brand(String companyName, String logoUrl, String color) {
        public Brand {
            companyName = companyName == null || companyName.isBlank() ? "Bộ phận Tuyển dụng" : companyName.trim();
            color = color != null && HEX_COLOR.matcher(color.trim()).matches() ? color.trim() : DEFAULT_COLOR;
            logoUrl = logoUrl != null && logoUrl.startsWith("https://") ? logoUrl : null;
        }
    }

    public static String html(Brand brand, String subject, String bodyText, String link, String linkLabel) {
        // Đoạn cuối bắt đầu bằng "Trân trọng" là chữ ký: nút bấm đặt ngay trước chữ ký.
        String[] blocks = (bodyText == null ? "" : bodyText.trim()).split("\\n\\s*\\n");
        int signature = blocks.length > 1 && blocks[blocks.length - 1].trim().toLowerCase().startsWith("trân trọng")
                ? blocks.length - 1 : -1;
        StringBuilder paragraphs = new StringBuilder();
        StringBuilder closing = new StringBuilder();
        for (int i = 0; i < blocks.length; i++) {
            String block = blocks[i];
            if (block.isBlank()) continue;
            (i == signature ? closing : paragraphs)
                    .append("<p style=\"margin:").append(i == signature ? "24px 0 0" : "0 0 16px")
                    .append(";font-size:15px;line-height:1.6;color:#1F2937;\">")
                    .append(escape(block.trim()).replace("\n", "<br>"))
                    .append("</p>");
        }
        String button = link == null || link.isBlank() ? "" :
                "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:8px 0 4px;\"><tr>"
                        + "<td style=\"border-radius:8px;background:" + brand.color() + ";\">"
                        + "<a href=\"" + escape(link) + "\" target=\"_blank\" style=\"display:inline-block;padding:12px 24px;"
                        + "font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;\">"
                        + escape(linkLabel == null || linkLabel.isBlank() ? "Xem chi tiết" : linkLabel) + "</a></td></tr></table>"
                        + "<p style=\"margin:12px 0 0;font-size:12px;line-height:1.5;color:#6B7280;\">Nếu nút không bấm được, "
                        + "mở liên kết sau: <a href=\"" + escape(link) + "\" style=\"color:" + brand.color() + ";word-break:break-all;\">"
                        + escape(link) + "</a></p>";
        String header = brand.logoUrl() != null
                ? "<img src=\"" + escape(brand.logoUrl()) + "\" alt=\"" + escape(brand.companyName())
                + "\" height=\"36\" style=\"display:block;height:36px;max-width:200px;border:0;\">"
                : "<span style=\"font-size:18px;font-weight:700;color:#FFFFFF;\">" + escape(brand.companyName()) + "</span>";
        String headerBg = brand.logoUrl() != null ? "#FFFFFF" : brand.color();
        return "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + escape(subject) + "</title></head>"
                + "<body style=\"margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#F3F4F6;padding:24px 12px;\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px;background:#FFFFFF;"
                + "border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;\">"
                + "<tr><td style=\"padding:20px 32px;background:" + headerBg + ";border-bottom:3px solid " + brand.color() + ";\">" + header + "</td></tr>"
                + "<tr><td style=\"padding:32px;\">"
                + "<h1 style=\"margin:0 0 20px;font-size:20px;line-height:1.4;color:#111827;\">" + escape(subject) + "</h1>"
                + paragraphs + button + closing
                + "</td></tr>"
                + "<tr><td style=\"padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.5;color:#6B7280;\">"
                + "Email được gửi tự động từ hệ thống tuyển dụng của " + escape(brand.companyName())
                + ". Vui lòng không trả lời email này.</td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
