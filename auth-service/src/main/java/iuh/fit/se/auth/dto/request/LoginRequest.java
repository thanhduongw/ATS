package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Email(message = "Email khong hop le") String email,
        @NotBlank(message = "Vui long nhap mat khau") @Size(max = 72) String password
) {}
