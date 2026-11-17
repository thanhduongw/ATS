package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.event.InterviewEventPublisher;
import iuh.fit.se.interview.event.InterviewReminderEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Mục 4.4 — nhắc lịch phỏng vấn trước 24 giờ và trước 1 giờ.
 *
 * <p>Chỉ nhắc buổi đã được chốt giờ (người phỏng vấn đã xác nhận, hoặc cả ứng viên đã xác nhận) và còn ở tương lai.
 * Mỗi mốc ghi lại thời điểm đã nhắc ngay trên dòng dữ liệu nên chạy lại / khởi động lại service không nhắc trùng;
 * đổi giờ hẹn thì hai mốc bị xoá ({@link Interview#resetReminders()}) và buổi được nhắc lại theo giờ mới.
 *
 * <p>Lịch đặt sát giờ (chưa đầy 24 giờ trước buổi) thì bỏ qua mốc 24 giờ — người nhận vừa được báo lịch xong —
 * và chỉ nhắc mốc 1 giờ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InterviewReminderJob {

    private static final List<InterviewStatus> REMINDABLE =
            List.of(InterviewStatus.HM_CONFIRMED, InterviewStatus.CANDIDATE_CONFIRMED);

    private final InterviewRepository interviewRepository;
    private final InterviewEventPublisher eventPublisher;

    @Scheduled(fixedDelayString = "${interview.reminder.scan-interval-ms:60000}", initialDelay = 45000)
    @Transactional
    public void sendDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        for (Interview interview : interviewRepository.findByStatusIn(REMINDABLE)) {
            LocalDateTime at = interview.getScheduledAt();
            if (at == null || !at.isAfter(now)) continue;
            long minutesLeft = Duration.between(now, at).toMinutes();

            if (minutesLeft <= 60) {
                if (interview.getReminder1hSentAt() == null) {
                    interview.setReminder1hSentAt(now);
                    if (interview.getReminder24hSentAt() == null) interview.setReminder24hSentAt(now);
                    publish(interview, 1);
                }
            } else if (minutesLeft <= 24 * 60 && interview.getReminder24hSentAt() == null) {
                interview.setReminder24hSentAt(now);
                LocalDateTime fixedAt = interview.getHmConfirmedAt() != null
                        ? interview.getHmConfirmedAt() : interview.getCreatedAt();
                boolean plannedAhead = fixedAt == null || fixedAt.isBefore(at.minusHours(24));
                if (plannedAhead) publish(interview, 24);
            }
        }
    }

    private void publish(Interview interview, int hoursBefore) {
        interviewRepository.save(interview);
        eventPublisher.publishInterviewReminder(new InterviewReminderEvent(
                interview.getId(), interview.getApplicationId(), interview.getScheduledAt(), hoursBefore,
                interview.getFormat() == null ? null : interview.getFormat().name(),
                interview.getMeetingLink(), interview.getWorkLocationId()));
        log.info("Nhắc lịch phỏng vấn {} (trước {} giờ)", interview.getId(), hoursBefore);
    }
}
