package iuh.fit.se.auth.dto.request;

import iuh.fit.se.auth.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(
        @NotBlank @Email String email,
        @NotBlank String fullName,
        @NotBlank String tempPassword,
        @NotNull RoleName role
) {}