package iuh.fit.se.application.event;

import iuh.fit.se.application.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ApplicationEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishApplicationCreated(
            Long jobPostingId,
            Long applicationId,
            Long candidateId,
            Long assignedRecruiterId,
            String candidateName) {
        publishApplicationCreated(jobPostingId, applicationId, candidateId, assignedRecruiterId, candidateName, null, null);
    }

    public void publishApplicationCreated(
            Long jobPostingId,
            Long applicationId,
            Long candidateId,
            Long assignedRecruiterId,
            String candidateName,
            String jobTitle,
            Long candidateUserId) {
        // Phát SAU KHI giao dịch ghi xong: ai-service nhận sự kiện là gọi lại lấy hồ sơ ngay,
        // phát sớm thì có lúc hồ sơ chưa kịp ghi và không được chấm điểm.
        afterCommit(() -> rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_CREATED_ROUTING_KEY,
                new ApplicationCreatedEvent(
                        applicationId, jobPostingId, candidateId, assignedRecruiterId, candidateName, jobTitle,
                        candidateUserId)
        ));
    }

    private void afterCommit(Runnable action) {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()
                && org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            action.run();
                        }
                    });
            return;
        }
        action.run();
    }

    public void publishApplicationStatusChanged(
            Long applicationId,
            Long jobPostingId,
            Long candidateId,
            Long assignedRecruiterId,
            String fromStageName,
            String toStageName,
            String toStageType) {
        publishApplicationStatusChanged(applicationId, jobPostingId, candidateId, assignedRecruiterId,
                fromStageName, toStageName, toStageType, null);
    }

    public void publishApplicationStatusChanged(
            Long applicationId,
            Long jobPostingId,
            Long candidateId,
            Long assignedRecruiterId,
            String fromStageName,
            String toStageName,
            String toStageType,
            String closedReason) {
        publishApplicationStatusChanged(applicationId, jobPostingId, candidateId, assignedRecruiterId,
                fromStageName, toStageName, toStageType, closedReason, null);
    }

    public void publishApplicationStatusChanged(
            Long applicationId,
            Long jobPostingId,
            Long candidateId,
            Long assignedRecruiterId,
            String fromStageName,
            String toStageName,
            String toStageType,
            String closedReason,
            String jobTitle) {
        publishApplicationStatusChanged(applicationId, jobPostingId, candidateId, assignedRecruiterId,
                fromStageName, toStageName, toStageType, closedReason, jobTitle, null);
    }

    public void publishApplicationStatusChanged(
            Long applicationId,
            Long jobPostingId,
            Long candidateId,
            Long assignedRecruiterId,
            String fromStageName,
            String toStageName,
            String toStageType,
            String closedReason,
            String jobTitle,
            String rejectionReason) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_STATUS_CHANGED_ROUTING_KEY,
                new ApplicationStatusChangedEvent(
                        applicationId, jobPostingId, candidateId, null,
                        assignedRecruiterId, fromStageName, toStageName, toStageType, closedReason, jobTitle,
                        rejectionReason)
        );
    }

    public void publishApplicationStale(
            Long applicationId, Long assignedRecruiterId,
            String candidateName, String currentStageName, long daysSinceUpdate) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_STALE_ROUTING_KEY,
                new ApplicationStaleEvent(
                        applicationId, assignedRecruiterId, candidateName, currentStageName, daysSinceUpdate)
        );
    }

    public void publishCommentMention(
            Long applicationId, Long mentionedUserId,
            Long authorUserId, String authorName, String commentExcerpt) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_COMMENT_MENTION_ROUTING_KEY,
                new ApplicationCommentMentionEvent(
                        applicationId, mentionedUserId, authorUserId, authorName, commentExcerpt)
        );
    }
}