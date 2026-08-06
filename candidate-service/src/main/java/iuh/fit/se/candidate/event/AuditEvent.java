package iuh.fit.se.candidate.event;

import java.time.LocalDateTime;

public record AuditEvent(
        Long tenantId, Long actorUserId, String action,
        String resourceType, Long resourceId, String metadata, LocalDateTime occurredAt
) {}