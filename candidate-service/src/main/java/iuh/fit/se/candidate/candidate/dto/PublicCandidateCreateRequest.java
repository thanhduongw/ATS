package iuh.fit.se.candidate.candidate.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PublicCandidateCreateRequest(
        @NotBlank(message = "Họ tên không được để trống") String fullName,
        @NotBlank @Email(message = "Email không hợp lệ") String email,
        String phone,
        boolean consentGiven
) {}