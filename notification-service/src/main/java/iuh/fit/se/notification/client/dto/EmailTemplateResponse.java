package iuh.fit.se.notification.client.dto;

public record EmailTemplateResponse(
        Long id, String code, String subject, String body, boolean active
) {}
