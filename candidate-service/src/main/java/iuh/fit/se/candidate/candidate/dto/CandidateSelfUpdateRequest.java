package iuh.fit.se.candidate.candidate.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

public record CandidateSelfUpdateRequest(
        @NotBlank String fullName,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String currentPosition,
        Long educationLevelId,
        List<Long> skillIds
) {}
