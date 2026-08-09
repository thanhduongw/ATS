package iuh.fit.se.dashboard.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ApplicationSummary(Long id, String currentStageName, String currentStageType) {}