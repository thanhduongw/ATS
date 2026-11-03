package iuh.fit.se.auth.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record CompanyResponse(
        Long id,
        String name,
        String description,
        String logoUrl,
        String bannerUrl,
        Integer dataRetentionMonths,
        /* docs/UI A08, C01 (quyết định C4, Q7). */
        String address,
        String phone,
        String legalName,
        String taxCode,
        LocalDate foundedDate,
        String website,
        String sizeRange,
        String recruitingEmail,
        String brandColor,
        Long dataProtectionOfficerId,
        String privacyPolicy,
        LocalDateTime privacyPolicyUpdatedAt,
        String tagline,
        String benefits
) {}
