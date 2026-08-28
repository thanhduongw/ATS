package iuh.fit.se.interview.interview.dto;

import java.time.LocalDateTime;

/**
 * Kết quả xếp lịch cho từng hồ sơ trong 1 lượt xếp lịch hàng loạt.
 * {@code shifted = true} khi hệ thống phải dời khung giờ đề xuất ban đầu
 * sang thời điểm rảnh kế tiếp do trùng lịch của người phỏng vấn.
 */
public record InterviewBulkScheduleItem(
        Long applicationId,
        String candidateName,
        LocalDateTime scheduledAt,
        Integer durationMinutes,
        boolean shifted,
        InterviewResponse interview
) {}
