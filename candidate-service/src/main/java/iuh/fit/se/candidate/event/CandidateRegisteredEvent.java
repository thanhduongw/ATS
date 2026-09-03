package iuh.fit.se.candidate.event;

public record CandidateRegisteredEvent(
        Long userId,
        String fullName,
        String email,
        String phone
) {}
