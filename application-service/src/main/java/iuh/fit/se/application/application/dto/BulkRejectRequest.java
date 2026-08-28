package iuh.fit.se.application.application.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BulkRejectRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất một hồ sơ") List<Long> ids,
        @NotNull(message = "Vui lòng chọn lý do từ chối") Long rejectionReasonId,
        String note
) {}
