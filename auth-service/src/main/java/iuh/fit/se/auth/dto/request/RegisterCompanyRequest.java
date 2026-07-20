package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterCompanyRequest(
        @NotBlank(message = "Mã công ty không được để trống") String tenantCode,
        @NotBlank(message = "Tên công ty không được để trống") String companyName,
        @NotBlank @Email(message = "Email không hợp lệ") String adminEmail,
        @NotBlank @Size(min = 8, message = "Mật khẩu phải từ 8 ký tự") String adminPassword,
        @NotBlank(message = "Họ tên không được để trống") String adminFullName
) {}