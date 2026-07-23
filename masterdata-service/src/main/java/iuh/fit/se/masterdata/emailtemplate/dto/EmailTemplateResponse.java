package iuh.fit.se.masterdata.emailtemplate.dto;

public record EmailTemplateResponse(
        Long id, String code, String subject, String body, boolean active
) {}