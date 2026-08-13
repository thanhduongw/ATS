package iuh.fit.se.application.client.dto;

public record CompanyResponse(
        Long id,
        Long tenantId,
        String name,
        String tenantCode
) {}