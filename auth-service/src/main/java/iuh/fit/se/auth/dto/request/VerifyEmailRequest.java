package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(
        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Vui lòng nhập mã xác minh")
        @Pattern(regexp = "\\d{6}", message = "Mã xác minh gồm đúng 6 chữ số")
        String otpCode
) {}
