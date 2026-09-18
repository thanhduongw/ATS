package iuh.fit.se.interview.interview.dto;

import java.time.LocalDateTime;

/**
 * HM từ chối giờ HR đặt.
 *
 * <p>Có {@code proposedScheduledAt} → buổi chuyển sang HM_RESCHEDULE_PROPOSED chờ HR duyệt.
 * Bỏ trống → buổi bị hủy luôn.
 */
public record InterviewHmRejectRequest(
        LocalDateTime proposedScheduledAt,
        String note
) {}
