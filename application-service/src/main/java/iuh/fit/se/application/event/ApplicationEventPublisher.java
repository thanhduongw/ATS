package iuh.fit.se.application.event;

import iuh.fit.se.application.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ApplicationEventPublisher {

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
}
