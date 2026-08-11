package iuh.fit.se.application.client.dto;

public record CandidateSummaryResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String cvFileUrl
) {}
