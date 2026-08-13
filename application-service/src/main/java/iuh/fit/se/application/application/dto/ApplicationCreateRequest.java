package iuh.fit.se.application.application.dto;

import jakarta.validation.constraints.NotNull;

public record ApplicationCreateRequest(
        Long candidateId,
        @NotNull(message = "Vui lòng chọn tin tuyển dụng") Long jobPostingId,
        @NotNull(message = "Vui lòng chọn nguồn tuyển dụng") Long recruitmentSourceId,
        Long assignedRecruiterId,
        String resumeUrl,
        String note
) {}