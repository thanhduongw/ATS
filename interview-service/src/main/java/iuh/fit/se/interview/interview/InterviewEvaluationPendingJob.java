package iuh.fit.se.interview.interview;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Buổi phỏng vấn đã qua giờ kết thúc mà hội đồng chưa nộp đủ phiếu thì tự chuyển sang
 * "Chờ đánh giá", để HR nhìn danh sách là thấy ngay chỗ đang tắc.
 *
 * <p>Không chuyển thẳng sang COMPLETED — COMPLETED vẫn do
 * {@code InterviewEvaluationService} đặt khi phiếu cuối cùng được nộp.
 *
 * <p>Lọc trong Java thay vì trong câu truy vấn vì phép cộng {@code scheduled_at +
 * duration_minutes} viết bằng JPQL không chạy giống nhau giữa các hệ quản trị, mà số buổi
 * đang ở trạng thái này luôn nhỏ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewEvaluationPendingJob {

    private final InterviewRepository interviewRepository;

    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void sweepOverdueInterviews() {
        LocalDateTime now = LocalDateTime.now();

        List<Interview> overdue = interviewRepository
                .findByStatus(InterviewStatus.CANDIDATE_CONFIRMED).stream()
                .filter(i -> i.getScheduledAt().plusMinutes(i.getDurationMinutes()).isBefore(now))
                .toList();

        if (overdue.isEmpty()) {
            return;
        }

        overdue.forEach(i -> i.setStatus(InterviewStatus.EVALUATION_PENDING));
        interviewRepository.saveAll(overdue);
        log.info("Chuyển {} buổi phỏng vấn quá giờ sang trạng thái Chờ đánh giá", overdue.size());
    }
}
