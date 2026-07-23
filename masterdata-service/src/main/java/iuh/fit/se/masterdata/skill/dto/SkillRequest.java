package iuh.fit.se.masterdata.skill.dto;

import jakarta.validation.constraints.NotBlank;

public record SkillRequest(
        @NotBlank(message = "Tên kỹ năng không được để trống") String name,
        String category
) {}