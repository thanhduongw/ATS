package iuh.fit.se.candidate.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PipelineResponse(Long id, String name, boolean active, List<PipelineStageResponse> stages) {}