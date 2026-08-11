package iuh.fit.se.application.event;

import java.time.LocalDateTime;

public record AuditEvent(
        Long tenantId,
        Long actorUserId,
        String action,
        String resourceType,
        Long resourceId,
        String metadata,
        LocalDateTime timestamp
) {}
