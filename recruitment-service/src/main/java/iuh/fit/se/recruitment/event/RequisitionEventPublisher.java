package iuh.fit.se.recruitment.event;

import iuh.fit.se.recruitment.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RequisitionEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishSubmitted(Long tenantId, Long requisitionId, Long approverId, String title) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.REQUISITION_SUBMITTED_ROUTING_KEY,
                new RequisitionSubmittedEvent(tenantId, requisitionId, approverId, title)
        );
    }
}