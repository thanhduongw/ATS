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
        LocalDateTime hiredAt,
        // C12: CV đã nộp kèm đơn và tên chuyên viên phụ trách (null nếu chưa phân công).
        // Không trả email cá nhân của nhân viên — giao diện dùng email tuyển dụng công khai của công ty.
        String resumeUrl,
        String recruiterName
) {}
