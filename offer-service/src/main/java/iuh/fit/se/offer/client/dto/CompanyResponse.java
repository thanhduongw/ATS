package iuh.fit.se.offer.client.dto;

public record CompanyResponse(
        Long id,
        Long tenantId,
        String name,
        String tenantCode
) {}
