package iuh.fit.se.application.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PipelineStageResponse(Long id, String name, Integer stageOrder, String stageType) {}
