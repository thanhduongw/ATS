package iuh.fit.se.auth.event;

import iuh.fit.se.auth.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TenantEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishTenantActivated(Long tenantId, String tenantCode) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                "tenant.activated",
                new TenantActivatedEvent(tenantId, tenantCode)
        );
    }
}