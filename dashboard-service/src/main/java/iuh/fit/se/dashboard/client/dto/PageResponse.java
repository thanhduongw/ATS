package iuh.fit.se.dashboard.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Mirrors candidate-service/application-service's PageResponse envelope for Feign deserialization. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PageResponse<T>(
        List<T> content,
        long totalItems,
        int totalPages,
        int pageNumber,
        int pageSize
) {}
