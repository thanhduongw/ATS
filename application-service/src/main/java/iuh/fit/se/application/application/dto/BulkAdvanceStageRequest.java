package iuh.fit.se.application.application.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BulkAdvanceStageRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất một hồ sơ") List<Long> ids,
        String note
) {}
