package iuh.fit.se.masterdata.common;

import java.time.LocalDateTime;

/** Cùng hình dạng với AuditEvent của các service khác (notification-service đọc theo tên trường). */
public record AuditEvent(
        Long actorUserId, String action,
        String resourceType, Long resourceId, String metadata, LocalDateTime occurredAt
) {}
