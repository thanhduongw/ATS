package iuh.fit.se.notification.client.dto;

/** GET /api/auth/public/theme — tên công ty, logo, màu thương hiệu (dùng cho khung email). */
public record PublicThemeResponse(String companyName, String logoUrl, String brandColor) {}
