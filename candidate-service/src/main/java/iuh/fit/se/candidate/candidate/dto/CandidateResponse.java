package iuh.fit.se.candidate.candidate.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record CandidateResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String currentPosition,
        Long educationLevelId,
        String educationLevelName,
        List<Long> skillIds,
        List<String> skillNames,
        String cvFileUrl,
        LocalDateTime createdAt
) {}