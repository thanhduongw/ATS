package iuh.fit.se.application.application.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ApplicationResponse(
        Long id,
        Long candidateId,
        String candidateName,
        Long jobPostingId,
        String jobTitle,
        Long departmentId,
        String departmentName,
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
        LocalDateTime appliedAt,
        LocalDateTime hiredAt,
        /* Điểm AI (bản sao từ ai-service): null khi chưa chấm / chấm lỗi. Chỉ trả cho người dùng nội bộ. */
        BigDecimal aiScore,
        String aiTier,
        String aiStatus
) {}
