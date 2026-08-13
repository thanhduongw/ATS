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
}