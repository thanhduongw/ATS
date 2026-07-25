package iuh.fit.se.recruitment.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PipelineResponse(Long id, String name, boolean active) {}