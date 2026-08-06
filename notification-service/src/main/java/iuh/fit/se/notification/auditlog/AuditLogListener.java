package iuh.fit.se.notification.auditlog;

import iuh.fit.se.notification.config.BusinessEventConfig;
import iuh.fit.se.notification.event.AuditEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuditLogListener {

    private final AuditLogRepository repository;

    @RabbitListener(queues = BusinessEventConfig.AUDIT_LOG_QUEUE)
    public void onAuditEvent(AuditEvent event) {
        repository.save(AuditLog.builder()
                .tenantId(event.tenantId())
                .actorUserId(event.actorUserId())
                .action(event.action())
                .resourceType(event.resourceType())
                .resourceId(event.resourceId())
                .metadata(event.metadata())
                .createdAt(event.occurredAt())
                .build());
    }
}