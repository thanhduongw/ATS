package iuh.fit.se.application.client.dto;

public record PublicCandidateCreateRequest(
        String fullName,
        String email,
        String phone,
        boolean consentGiven
) {}