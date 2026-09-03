package iuh.fit.se.auth.event;

public record CandidateRegisteredEvent(
        Long userId,
        String fullName,
        String email,
        String phone
) {}
