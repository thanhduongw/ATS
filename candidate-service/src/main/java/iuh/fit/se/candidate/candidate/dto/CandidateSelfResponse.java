package iuh.fit.se.candidate.candidate.dto;

import java.time.LocalDate;
import java.util.List;

public record CandidateSelfResponse(
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
        boolean resumeUploaded,
        String resumeUrl
) {}
