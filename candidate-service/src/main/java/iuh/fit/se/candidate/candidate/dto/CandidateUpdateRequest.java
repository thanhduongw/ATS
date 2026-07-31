package iuh.fit.se.candidate.candidate.dto;

// Giống hệt CreateRequest
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

public record CandidateUpdateRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String currentPosition,
        Long educationLevelId,
        List<Long> skillIds
) {}