package iuh.fit.se.application.application.dto;

import java.time.LocalDateTime;

public record CandidateApplicationResponse(
        Long id,
        Long jobPostingId,
        String jobTitle,
        Long departmentId,
        String departmentName,
        String currentStageName,
        Integer currentStageOrder,
        String currentStageType,
        String rejectionReasonName,
        LocalDateTime appliedAt,
        LocalDateTime hiredAt
) {}
