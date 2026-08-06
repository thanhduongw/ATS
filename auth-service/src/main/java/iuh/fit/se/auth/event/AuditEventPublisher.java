package iuh.fit.se.auth.event;

import iuh.fit.se.auth.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AuditEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(Long tenantId, Long actorUserId, String action, String resourceType, Long resourceId, String metadata) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ATS_EXCHANGE,
                RabbitMQConfig.AUDIT_LOG_ROUTING_KEY,
                new AuditEvent(tenantId, actorUserId, action, resourceType, resourceId, metadata, LocalDateTime.now())
        );
    }
}