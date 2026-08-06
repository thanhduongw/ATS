package iuh.fit.se.notification.notification.dto;

import iuh.fit.se.notification.notification.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id, NotificationType type, String title, String message,
        String resourceType, Long resourceId, boolean read, LocalDateTime createdAt
) {}