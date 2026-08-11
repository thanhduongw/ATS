package iuh.fit.se.application.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JobPostingResponse(Long id, Long pipelineId, String status) {}
