package iuh.fit.se.candidate.candidate.dto;

public record CandidateSummaryResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String cvFileUrl
) {}
