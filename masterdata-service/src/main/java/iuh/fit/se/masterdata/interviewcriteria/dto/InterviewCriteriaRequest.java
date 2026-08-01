package iuh.fit.se.masterdata.interviewcriteria.dto;

import jakarta.validation.constraints.NotBlank;

public record InterviewCriteriaRequest(
        @NotBlank(message = "Tên tiêu chí đánh giá không được để trống") String name,
        String description
) {}