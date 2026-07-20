package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập mã công ty") String tenantCode,
        @NotBlank @Email(message = "Email không hợp lệ") String email,
        @NotBlank(message = "Vui lòng nhập mật khẩu") String password
) {}