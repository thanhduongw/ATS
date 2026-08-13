package iuh.fit.se.recruitment.client.dto;

public record CompanyResponse(
        Long id,
        Long tenantId,
        String name,
        String tenantCode
) {}