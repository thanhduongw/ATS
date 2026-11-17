package iuh.fit.se.interview.event;

import iuh.fit.se.interview.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class InterviewEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishInterviewScheduled(Long interviewId, Long applicationId, LocalDateTime scheduledAt) {
        publishAfterCommit(() -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.INTERVIEW_SCHEDULED_ROUTING_KEY,
                new InterviewScheduledEvent(interviewId, applicationId, scheduledAt)));
    }

    /** HM chốt giờ — notification-service dựa vào đây để báo cho ứng viên. */
    public void publishInterviewHmConfirmed(
            Long interviewId, Long applicationId, LocalDateTime scheduledAt, String candidateName) {
        publishAfterCommit(() -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.INTERVIEW_HM_CONFIRMED_ROUTING_KEY,
                new InterviewHmConfirmedEvent(interviewId, applicationId, scheduledAt, candidateName)));
    }

    public void publishInterviewCandidateDeclined(InterviewCandidateDeclinedEvent event) {
        publishAfterCommit(() -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.INTERVIEW_CANDIDATE_DECLINED_ROUTING_KEY,
                event));
    }

    public void publishInterviewConfirmed(
            Long interviewId, Long applicationId, LocalDateTime scheduledAt, String candidateName) {
        publishAfterCommit(() -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.INTERVIEW_CONFIRMED_ROUTING_KEY,
                new InterviewConfirmedEvent(interviewId, applicationId, scheduledAt, candidateName)));
    }

    public void publishInterviewCancelled(InterviewCancelledEvent event) {
        publishAfterCommit(() -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE, RabbitMQConfig.INTERVIEW_CANCELLED_ROUTING_KEY, event));
    }

    public void publishInterviewReminder(InterviewReminderEvent event) {
        publishAfterCommit(() -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE, RabbitMQConfig.INTERVIEW_REMINDER_ROUTING_KEY, event));
    }

    /** 3.11: ghi nhật ký hệ thống cho thao tác với lịch phỏng vấn / phiếu đánh giá. Lỗi gửi không làm hỏng thao tác. */
    public void publishAudit(Long actorUserId, String action, String resourceType, Long resourceId, String metadata) {
        publishAfterCommit(() -> {
            try {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.ATS_EXCHANGE,
                        RabbitMQConfig.AUDIT_LOG_ROUTING_KEY,
                        new AuditEvent(actorUserId, action, resourceType, resourceId, metadata, LocalDateTime.now()));
            } catch (RuntimeException ignored) {
                // nhật ký là phụ, không chặn nghiệp vụ
            }
        });
    }

    /** Chỉ phát sự kiện khi dữ liệu đã ghi thành công để listener luôn đọc được bản ghi mới. */
    private void publishAfterCommit(Runnable publishAction) {
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publishAction.run();
                }
            });
            return;
        }
        publishAction.run();
    }
}
