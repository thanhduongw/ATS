package iuh.fit.se.auth.dto.response;

public record CompanyResponse(
        Long id,
        String name,
        String description,
        String logoUrl,
        String bannerUrl,
        Integer dataRetentionMonths
) {}
