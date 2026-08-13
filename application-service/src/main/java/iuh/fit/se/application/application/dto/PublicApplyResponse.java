package iuh.fit.se.application.application.dto;

import java.time.LocalDateTime;

public record PublicApplyResponse(
        Long applicationId,
        Long candidateId,
        String candidateName,
        String candidateEmail,
        Long jobPostingId,
        String currentStageName,
        LocalDateTime appliedAt,
        String message
) {}