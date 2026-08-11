package iuh.fit.se.offer.event;

import iuh.fit.se.offer.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OfferEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishOfferApproved(Long tenantId, Long offerId, Long applicationId, Long requesterId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_APPROVED_ROUTING_KEY,
                new OfferApprovedEvent(tenantId, offerId, applicationId, requesterId)
        );
    }
}
