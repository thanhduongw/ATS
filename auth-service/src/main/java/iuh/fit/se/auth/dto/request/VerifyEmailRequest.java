package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
        @NotBlank String tenantCode,
        @NotBlank @Email String email,
        @NotBlank String otpCode
) {}