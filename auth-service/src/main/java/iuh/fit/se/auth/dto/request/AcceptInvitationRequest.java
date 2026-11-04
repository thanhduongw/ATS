package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Đặt mật khẩu khi nhận lời mời (docs/UI A04 "Đặt mật khẩu & bắt đầu"; M09: ít nhất 8 ký tự, có chữ và số). */
public record AcceptInvitationRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu")
        @Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Mật khẩu phải có cả chữ và số")
        String password
) {}
