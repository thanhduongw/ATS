package iuh.fit.se.candidate.candidate.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

public record CandidateCreateRequest(
        @NotBlank(message = "Họ tên không được để trống") String fullName,
        @NotBlank @Email(message = "Email không hợp lệ") String email,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String currentPosition,
        Long educationLevelId,
        List<Long> skillIds
) {}