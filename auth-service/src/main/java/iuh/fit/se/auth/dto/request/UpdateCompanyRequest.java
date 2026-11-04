package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** docs/UI A08: Thông tin pháp lý · Nhận diện · Bảo vệ dữ liệu ứng viên; C01: khẩu hiệu, phúc lợi. */
public record UpdateCompanyRequest(
        /** Tên hiển thị (A08 "Tên hiển thị *"). */
        @NotBlank(message = "Tên công ty không được để trống")
        String name,
        String description,
        String logoUrl,
        String bannerUrl,
        @Min(value = 1, message = "Thời gian lưu hồ sơ tối thiểu 1 tháng")
        Integer dataRetentionMonths,
        String address,
        String phone,
        @Size(max = 255) String legalName,
        @Size(max = 32) String taxCode,
        LocalDate foundedDate,
        @Size(max = 255) String website,
        @Size(max = 64) String sizeRange,
        @Email(message = "Email tuyển dụng không hợp lệ") String recruitingEmail,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Màu thương hiệu phải có dạng #RRGGBB") String brandColor,
        Long dataProtectionOfficerId,
        String privacyPolicy,
        @Size(max = 255) String tagline,
        /** JSON: [{"title": "...", "description": "..."}]. */
        String benefits
) {}
