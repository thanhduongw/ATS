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
            Long offerId,
            Long applicationId,
            Long requesterId,
            Long candidateId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_APPROVED_ROUTING_KEY,
                new OfferApprovedEvent(offerId, applicationId, requesterId, candidateId)
        );
    }

    public void publishOfferAccepted(
            Long offerId,
            Long applicationId,
            Long requesterId,
            String candidateName,
            Long candidateUserId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_ACCEPTED_ROUTING_KEY,
                new OfferAcceptedEvent(
                        offerId,
                        applicationId,
                        requesterId,
                        candidateName,
                        candidateUserId
                )
        );
    }

    public void publishOfferDeclined(
            Long offerId,
            Long applicationId,
            Long requesterId,
            String candidateName,
            String note,
            Long declineReasonId,
            Long candidateUserId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.OFFER_DECLINED_ROUTING_KEY,
                new OfferDeclinedEvent(
                        offerId,
                        applicationId,
                        requesterId,
                        candidateName,
                        note,
                        declineReasonId,
                        candidateUserId
                )
        );
    }
}