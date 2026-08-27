package iuh.fit.se.dashboard.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InterviewSummary(
        Long id,
        Long applicationId,
        LocalDateTime scheduledAt,
        String status
) {}
