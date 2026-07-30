package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateCompanyRequest(
        @NotBlank(message = "Tên công ty không được để trống")
        String name
) {}
