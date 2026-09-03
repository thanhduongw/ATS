package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
        @NotBlank(message = "Ho va ten khong duoc de trong")
        String fullName,
        String phone
) {}
