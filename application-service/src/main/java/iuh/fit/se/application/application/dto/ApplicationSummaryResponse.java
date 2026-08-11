package iuh.fit.se.application.application.dto;

import java.time.LocalDateTime;

/**
 * Lightweight summary used by other services (offer-service, interview-service)
 * to look up an application without needing full details.
 */
public record ApplicationSummaryResponse(
        Long id,
        Long candidateId,
        String candidateName,
        String candidateEmail,
        Long jobPostingId,
        Integer currentStageOrder,
        String currentStageType,
        String currentStageName,
        LocalDateTime appliedAt
) {}
