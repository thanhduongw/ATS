package iuh.fit.se.application.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Trạng thái chấm điểm AI của một hồ sơ, do ai-service phát ở mỗi lần đổi trạng thái.
 *
 * @param status    PENDING | PROCESSING | COMPLETED | FAILED
 * @param totalScore điểm 0-100, chỉ có khi COMPLETED
 * @param tier      GOOD_FIT | POTENTIAL_FIT | NOT_FIT, chỉ có khi COMPLETED
 * @param updatedAt thời điểm đổi trạng thái theo đồng hồ ai-service — để bỏ qua sự kiện đến muộn
 */
public record AiScoringCompletedEvent(
        Long applicationId, Long jobPostingId, String status, BigDecimal totalScore, String tier,
        LocalDateTime updatedAt
) {}
