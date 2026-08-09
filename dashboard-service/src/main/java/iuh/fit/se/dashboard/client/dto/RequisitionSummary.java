package iuh.fit.se.dashboard.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RequisitionSummary(Long id, String status) {}