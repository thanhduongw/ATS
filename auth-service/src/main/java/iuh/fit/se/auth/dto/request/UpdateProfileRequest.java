package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên")
        String fullName,
        String phone
) {}
