package iuh.fit.se.interview.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ApplicationSummaryResponse(
        Long id, Long candidateId, String candidateName, Long jobPostingId,
        Integer currentStageOrder, String currentStageType
) {}