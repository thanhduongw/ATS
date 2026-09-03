package iuh.fit.se.application.event;

import iuh.fit.se.application.application.ApplicationService;
import iuh.fit.se.application.application.dto.ApplicationAdvanceStageRequest;
import iuh.fit.se.application.application.dto.ApplicationRejectRequest;
import iuh.fit.se.application.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Applies the application-side effect of a candidate answering an offer.
 *
 * <p>The candidate owns the offer response but has no authorization to change an application
 * stage, so offer-service publishes the outcome instead of calling this service with a forged
 * identity. The stage change is recorded against the candidate's own user id for the audit trail.
 *
 * <p>Exceptions are logged and the message is acknowledged: the deployment has no dead-letter
 * queue, so rethrowing would requeue the message forever.
 */
@Component
@RequiredArgsConstructor
public class OfferOutcomeListener {

    private static final Logger log = LoggerFactory.getLogger(OfferOutcomeListener.class);

    private final ApplicationService applicationService;

    @RabbitListener(queues = RabbitMQConfig.OFFER_ACCEPTED_QUEUE)
    public void onOfferAccepted(OfferAcceptedEvent event) {
        try {
            applicationService.applyAdvanceStage(
                    event.applicationId(),
                    event.candidateUserId(),
                    new ApplicationAdvanceStageRequest("Ứng viên đã chấp nhận Offer"));
        } catch (Exception e) {
            log.error("Khong the chuyen giai doan cho application {} sau khi offer {} duoc chap nhan: {}",
                    event.applicationId(), event.offerId(), e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.OFFER_DECLINED_QUEUE)
    public void onOfferDeclined(OfferDeclinedEvent event) {
        try {
            applicationService.applyReject(
                    event.applicationId(),
                    event.candidateUserId(),
                    new ApplicationRejectRequest(
                            event.declineReasonId(),
                            "Ứng viên từ chối Offer: "
                                    + (event.note() != null ? event.note() : "")));
        } catch (Exception e) {
            log.error("Khong the tu choi application {} sau khi offer {} bi tu choi: {}",
                    event.applicationId(), event.offerId(), e.getMessage());
        }
    }
}
