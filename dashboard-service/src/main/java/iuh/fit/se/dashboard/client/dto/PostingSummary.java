package iuh.fit.se.dashboard.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PostingSummary(Long id, String status) {}