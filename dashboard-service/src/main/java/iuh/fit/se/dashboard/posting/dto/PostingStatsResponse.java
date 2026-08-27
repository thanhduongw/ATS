package iuh.fit.se.dashboard.posting.dto;

import java.util.Map;

public record PostingStatsResponse(
        Long jobPostingId,
        long totalApplications,
        long interviewingCount,
        long offerCount,
        long hiredCount,
        Map<String, Long> byStage,
        /** applicationId -> trạng thái buổi phỏng vấn gần nhất (SCHEDULED/CONFIRMED/COMPLETED/CANCELLED), null nếu chưa có lịch. */
        Map<Long, String> latestInterviewStatusByApplicationId
) {}
