package iuh.fit.se.candidate.event;

import iuh.fit.se.candidate.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CandidateEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishApplicationCreated(Long jobPostingId, Long applicationId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_CREATED_ROUTING_KEY,
                new ApplicationCreatedEvent(jobPostingId, applicationId)
        );
    }

    public void publishApplicationStatusChanged(Long applicationId, Long jobPostingId, String fromStageName, String toStageName) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.APPLICATION_STATUS_CHANGED_ROUTING_KEY,
                new ApplicationStatusChangedEvent(applicationId, jobPostingId, fromStageName, toStageName)
        );
    }

    public void publishOfferApproved(Long tenantId, Long offerId, Long applicationId, Long requesterId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_APPROVED_ROUTING_KEY,
                new OfferApprovedEvent(tenantId, offerId, applicationId, requesterId)
        );
    }
}