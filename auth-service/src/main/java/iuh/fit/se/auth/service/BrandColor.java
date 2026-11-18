package iuh.fit.se.auth.service;

import iuh.fit.se.auth.exception.BusinessException;

/** Kiểm tra màu thương hiệu (mục 4.1): dạng #RRGGBB và đủ tương phản 4,5:1 với chữ trắng (WCAG AA). */
public final class BrandColor {

    public static final double MIN_CONTRAST = 4.5;

    private BrandColor() {}

    /** Trả về mã màu chuẩn hoá (chữ hoa) hoặc null nếu để trống. */
    public static String validate(String hex) {
        if (hex == null || hex.isBlank()) return null;
        String value = hex.trim().toUpperCase();
        if (!value.matches("^#[0-9A-F]{6}$")) {
            throw new BusinessException("Màu thương hiệu phải có dạng #RRGGBB");
        }
        if (contrastWithWhite(value) < MIN_CONTRAST) {
            throw new BusinessException("Màu thương hiệu quá nhạt: chữ trắng trên nền này khó đọc. Hãy chọn màu đậm hơn.");
        }
        return value;
    }

    public static double contrastWithWhite(String hex) {
        double luminance = 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
        return 1.05 / (luminance + 0.05);
    }

    private static double channel(String hex, int from) {
        double c = Integer.parseInt(hex.substring(from, from + 2), 16) / 255.0;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
}
