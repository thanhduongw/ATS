package iuh.fit.se.interview.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CandidateSummaryResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String cvFileUrl
) {}