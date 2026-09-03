package iuh.fit.se.auth.event;

import iuh.fit.se.auth.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CandidateRegistrationPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(CandidateRegisteredEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.CANDIDATE_REGISTERED_ROUTING_KEY,
                event
        );
    }
}
