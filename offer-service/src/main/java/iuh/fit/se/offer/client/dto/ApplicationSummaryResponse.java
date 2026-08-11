package iuh.fit.se.offer.client.dto;

import java.time.LocalDateTime;

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
