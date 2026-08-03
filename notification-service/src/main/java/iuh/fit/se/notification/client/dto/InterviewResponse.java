package iuh.fit.se.notification.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InterviewResponse(
        Long id, Long applicationId, String candidateName, LocalDateTime scheduledAt,
        String status, List<InterviewerSummary> interviewers
) {}