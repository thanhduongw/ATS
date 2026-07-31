package iuh.fit.se.candidate.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogItemResponse(Long id, String name, boolean active) {}