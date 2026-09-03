package iuh.fit.se.auth.event;

import java.time.LocalDateTime;

public record AuditEvent(
        Long actorUserId, String action,
        String resourceType, Long resourceId, String metadata, LocalDateTime occurredAt
) {}
