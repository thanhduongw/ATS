package iuh.fit.se.candidate.client.dto;

public record CompanyResponse(
        Long id,
        Long tenantId,
        String name,
        String tenantCode
) {}