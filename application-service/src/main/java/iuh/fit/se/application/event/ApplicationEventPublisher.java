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
            Long tenantId,
            Long jobPostingId,
            Long applicationId,
            Long candidateId,
            Long assignedRecruiterId,
            String candidateName) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_CREATED_ROUTING_KEY,
                new ApplicationCreatedEvent(
                        tenantId, applicationId, jobPostingId, candidateId, assignedRecruiterId, candidateName)
        );
    }

    public void publishApplicationStatusChanged(
            Long tenantId,
            Long applicationId,
            Long jobPostingId,
            Long candidateId,
            Long assignedRecruiterId,
            String fromStageName,
            String toStageName,
            String toStageType) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_STATUS_CHANGED_ROUTING_KEY,
                new ApplicationStatusChangedEvent(
                        tenantId, applicationId, jobPostingId, candidateId, null,
                        assignedRecruiterId, fromStageName, toStageName, toStageType)
        );
    }

    public void publishApplicationStale(
            Long tenantId, Long applicationId, Long assignedRecruiterId,
            String candidateName, String currentStageName, long daysSinceUpdate) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_STALE_ROUTING_KEY,
                new ApplicationStaleEvent(
                        tenantId, applicationId, assignedRecruiterId, candidateName, currentStageName, daysSinceUpdate)
        );
    }

    public void publishCommentMention(
            Long tenantId, Long applicationId, Long mentionedUserId,
            Long authorUserId, String authorName, String commentExcerpt) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_COMMENT_MENTION_ROUTING_KEY,
                new ApplicationCommentMentionEvent(
                        tenantId, applicationId, mentionedUserId, authorUserId, authorName, commentExcerpt)
        );
    }
}