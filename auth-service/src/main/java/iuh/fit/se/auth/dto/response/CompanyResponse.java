package iuh.fit.se.auth.dto.response;

public record CompanyResponse(
        Long id,
        Long tenantId,
        String name,
        String tenantCode,
        String description,
        String logoUrl,
        String bannerUrl,
        Integer dataRetentionMonths
) {}
