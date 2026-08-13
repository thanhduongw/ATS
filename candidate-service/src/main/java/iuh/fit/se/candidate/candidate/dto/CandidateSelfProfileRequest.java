package iuh.fit.se.candidate.candidate.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CandidateSelfProfileRequest(
        @NotBlank(message = "Họ tên không được để trống") String fullName,
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ") String email
) {}