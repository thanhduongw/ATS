package iuh.fit.se.offer.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CandidateSummaryResponse(
        Long id, String fullName, String email, String phone, String cvFileUrl
) {}