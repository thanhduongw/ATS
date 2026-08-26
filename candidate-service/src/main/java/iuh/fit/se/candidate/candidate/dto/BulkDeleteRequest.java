package iuh.fit.se.candidate.candidate.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BulkDeleteRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất một ứng viên") List<Long> ids
) {}
