package iuh.fit.se.application.application.dto;

import jakarta.validation.constraints.NotNull;

public record ApplicationAssignRecruiterRequest(
        @NotNull(message = "Vui lòng chọn người phụ trách") Long assignedRecruiterId
) {}
