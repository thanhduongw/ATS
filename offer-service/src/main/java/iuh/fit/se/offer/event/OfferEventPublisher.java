package iuh.fit.se.offer.event;

import iuh.fit.se.offer.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OfferEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishOfferApproved(
            Long tenantId, Long offerId, Long applicationId, Long requesterId, Long candidateUserId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_APPROVED_ROUTING_KEY,
                new OfferApprovedEvent(tenantId, offerId, applicationId, requesterId, candidateUserId)
        );
    }

    public void publishOfferAccepted(
            Long tenantId, Long offerId, Long applicationId, Long requesterId, String candidateName) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_ACCEPTED_ROUTING_KEY,
                new OfferAcceptedEvent(tenantId, offerId, applicationId, requesterId, candidateName)
        );
    }

    public void publishOfferDeclined(
            Long tenantId, Long offerId, Long applicationId, Long requesterId, String candidateName, String note) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_DECLINED_ROUTING_KEY,
                new OfferDeclinedEvent(tenantId, offerId, applicationId, requesterId, candidateName, note)
        );
    }
}