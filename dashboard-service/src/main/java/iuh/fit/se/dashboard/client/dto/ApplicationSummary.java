package iuh.fit.se.dashboard.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ApplicationSummary(
        Long id,
        String currentStageName,
        String currentStageType,
        Integer currentStageOrder,
        Long recruitmentSourceId,
        String recruitmentSourceName,
        Long assignedRecruiterId,
        String assignedRecruiterName,
        LocalDateTime appliedAt,
        LocalDateTime hiredAt
) {}
