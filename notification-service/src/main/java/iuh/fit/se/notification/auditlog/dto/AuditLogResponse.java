package iuh.fit.se.notification.auditlog.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id, Long actorUserId, String actorName, String action,
        String resourceType, Long resourceId, String metadata, LocalDateTime createdAt
) {}