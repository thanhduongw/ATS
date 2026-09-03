package iuh.fit.se.auth.dto.request;

import iuh.fit.se.auth.enums.RoleName;
import iuh.fit.se.auth.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank @Email String email,
        @NotBlank String fullName,
        @NotBlank @Size(min = 8, max = 72) String tempPassword,
        @NotNull RoleName role,
        String phone,
        Long departmentId,
        @NotNull UserStatus status
) {}
