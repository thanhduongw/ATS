package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CandidateRegistrationRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Vui lòng nhập mật khẩu")
        @Size(min = 8, max = 72, message = "Mật khẩu phải có từ 8 đến 72 ký tự")
        String password,

        @NotBlank(message = "Vui lòng nhập lại mật khẩu")
        @Size(max = 72)
        String confirmPassword,

        String phone,

        /** Đồng ý cho doanh nghiệp xử lý dữ liệu cá nhân (Nghị định 13/2023) — bắt buộc phải là true. */
        @jakarta.validation.constraints.NotNull(message = "Bạn cần đồng ý với chính sách bảo vệ dữ liệu cá nhân")
        @jakarta.validation.constraints.AssertTrue(message = "Bạn cần đồng ý với chính sách bảo vệ dữ liệu cá nhân")
        Boolean consentAccepted
) {}
