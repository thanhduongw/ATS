package iuh.fit.se.auth.dto.request;

import iuh.fit.se.auth.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** docs/UI A04 "Mời người dùng". */
public record InviteUserRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên") @Size(max = 255) String fullName,
        @NotBlank(message = "Vui lòng nhập email công ty") @Email(message = "Email không hợp lệ") String email,
        @NotNull(message = "Vui lòng chọn vai trò") RoleName role,
        Long departmentId,
        @Size(max = 255) String jobTitle,
        @Size(max = 2000) String message
) {}
