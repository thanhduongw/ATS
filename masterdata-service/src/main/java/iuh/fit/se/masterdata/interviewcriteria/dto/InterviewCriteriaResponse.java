package iuh.fit.se.masterdata.interviewcriteria.dto;

public record InterviewCriteriaResponse(
        Long id,
        String name,
        String description,
        boolean active
) {}