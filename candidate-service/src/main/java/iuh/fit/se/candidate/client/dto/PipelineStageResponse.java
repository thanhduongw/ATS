package iuh.fit.se.candidate.client.dto;

public record PipelineStageResponse(Long id, String name, String stageType, Integer stageOrder) {}