package iuh.fit.se.offer.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Chi lay phan can cho kiem soat headcount; recruitment-service tra ve nhieu truong hon nen
 * bo qua phan con lai thay vi phai dong bo toan bo DTO.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JobPostingSummaryResponse(
        Long id,
        Long requisitionId,
        String title,
        Integer headcount
) {}
