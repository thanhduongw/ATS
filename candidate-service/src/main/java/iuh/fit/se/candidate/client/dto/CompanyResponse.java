package iuh.fit.se.candidate.client.dto;

public record CompanyResponse(
        Long id,
        String name,
        Integer dataRetentionMonths
) {}
