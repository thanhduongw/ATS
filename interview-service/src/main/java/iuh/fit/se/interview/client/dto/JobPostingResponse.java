package iuh.fit.se.interview.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JobPostingResponse(Long id, Long pipelineId, String status) {}