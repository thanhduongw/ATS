package iuh.fit.se.application.application.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BulkAssignRecruiterRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất một hồ sơ") List<Long> ids,
        @NotNull(message = "Vui lòng chọn người phụ trách") Long assignedRecruiterId
) {}
