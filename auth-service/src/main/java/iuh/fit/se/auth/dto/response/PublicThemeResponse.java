package iuh.fit.se.auth.dto.response;

/** Nhận diện công khai của doanh nghiệp cho web và ứng dụng di động (mục 4.1). Không cần đăng nhập. */
public record PublicThemeResponse(String companyName, String logoUrl, String brandColor) {}
