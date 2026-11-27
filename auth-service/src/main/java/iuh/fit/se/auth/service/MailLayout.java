package iuh.fit.se.auth.service;

import java.util.regex.Pattern;

/**
 * Khung HTML cho email của auth-service (mã xác minh, đặt lại mật khẩu, lời mời) — cùng kiểu khung với email
 * thông báo của notification-service: đầu thư mang tên / logo và màu công ty, nội dung, khối mã hoặc nút, chân thư.
 */
final class MailLayout {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    private MailLayout() {}

    record Brand(String companyName, String logoUrl, String color) {
        Brand {
            companyName = companyName == null || companyName.isBlank() ? "Bộ phận Tuyển dụng" : companyName.trim();
            color = color != null && HEX_COLOR.matcher(color.trim()).matches() ? color.trim() : "#1F5EFF";
            logoUrl = logoUrl != null && logoUrl.startsWith("https://") ? logoUrl : null;
        }
    }

    /** Một đoạn văn. */
    static String p(String text) {
        return "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;color:#1F2937;\">" + escape(text) + "</p>";
    }

    /** Đoạn chú thích nhỏ, màu xám. */
    static String note(String text) {
        return "<p style=\"margin:16px 0 0;font-size:13px;line-height:1.6;color:#6B7280;\">" + escape(text) + "</p>";
    }

    /** Khối trích dẫn (lời nhắn của người mời). */
    static String quote(Brand b, String text) {
        return "<div style=\"margin:0 0 16px;padding:12px 16px;background:#F9FAFB;border-left:3px solid " + b.color()
                + ";font-size:15px;line-height:1.6;color:#374151;font-style:italic;\">" + escape(text).replace("\n", "<br>") + "</div>";
    }

    /** Ô hiển thị mã OTP. */
    static String code(Brand b, String otp) {
        return "<div style=\"margin:8px 0 20px;padding:16px;text-align:center;background:#F9FAFB;border:1px dashed " + b.color()
                + ";border-radius:10px;\"><span style=\"font-family:'Courier New',monospace;font-size:30px;font-weight:700;"
                + "letter-spacing:8px;color:#111827;\">" + escape(otp) + "</span></div>";
    }

    /** Nút bấm + đường link dự phòng. */
    static String button(Brand b, String label, String link) {
        return "<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:8px 0 4px;\"><tr>"
                + "<td style=\"border-radius:8px;background:" + b.color() + ";\"><a href=\"" + escape(link)
                + "\" target=\"_blank\" style=\"display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;"
                + "color:#FFFFFF;text-decoration:none;border-radius:8px;\">" + escape(label) + "</a></td></tr></table>"
                + "<p style=\"margin:12px 0 0;font-size:12px;line-height:1.5;color:#6B7280;\">Nếu nút không bấm được, mở liên kết sau: "
                + "<a href=\"" + escape(link) + "\" style=\"color:" + b.color() + ";word-break:break-all;\">" + escape(link) + "</a></p>";
    }

    static String page(Brand b, String heading, String content) {
        String header = b.logoUrl() != null
                ? "<img src=\"" + escape(b.logoUrl()) + "\" alt=\"" + escape(b.companyName())
                + "\" height=\"36\" style=\"display:block;height:36px;max-width:200px;border:0;\">"
                : "<span style=\"font-size:18px;font-weight:700;color:#FFFFFF;\">" + escape(b.companyName()) + "</span>";
        String headerBg = b.logoUrl() != null ? "#FFFFFF" : b.color();
        return "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + escape(heading) + "</title></head>"
                + "<body style=\"margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#F3F4F6;padding:24px 12px;\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px;background:#FFFFFF;"
                + "border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;\">"
                + "<tr><td style=\"padding:20px 32px;background:" + headerBg + ";border-bottom:3px solid " + b.color() + ";\">" + header + "</td></tr>"
                + "<tr><td style=\"padding:32px;\"><h1 style=\"margin:0 0 20px;font-size:20px;line-height:1.4;color:#111827;\">"
                + escape(heading) + "</h1>" + content
                + "<p style=\"margin:24px 0 0;font-size:15px;line-height:1.6;color:#1F2937;\">Trân trọng,<br>"
                + escape(b.companyName()) + "</p></td></tr>"
                + "<tr><td style=\"padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.5;color:#6B7280;\">"
                + "Email được gửi tự động từ hệ thống tuyển dụng của " + escape(b.companyName())
                + ". Vui lòng không trả lời email này.</td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
