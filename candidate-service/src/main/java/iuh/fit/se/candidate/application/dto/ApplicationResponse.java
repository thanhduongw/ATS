package iuh.fit.se.candidate.application.dto;

import java.time.LocalDateTime;

public record ApplicationResponse(
        Long id,
        Long candidateId,
        String candidateName,
        Long jobPostingId,
        Long recruitmentSourceId,
        String recruitmentSourceName,
        Long assignedRecruiterId,
        String assignedRecruiterName,
        String resumeUrl,
        Long currentStageId,
        String currentStageName,
        Integer currentStageOrder,
        String currentStageType,
        Long rejectionReasonId,
        String rejectionReasonName,
        String note,
        LocalDateTime appliedAt
) {}