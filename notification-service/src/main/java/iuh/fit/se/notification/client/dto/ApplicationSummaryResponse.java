package iuh.fit.se.notification.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ApplicationSummaryResponse(Long id, Long assignedRecruiterId, String candidateName) {}