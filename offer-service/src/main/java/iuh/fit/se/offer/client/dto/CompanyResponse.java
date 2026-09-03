package iuh.fit.se.offer.client.dto;

public record CompanyResponse(
        Long id,
        String name,
        String description,
        String logoUrl,
        String bannerUrl,
        Integer dataRetentionMonths
) {
}
