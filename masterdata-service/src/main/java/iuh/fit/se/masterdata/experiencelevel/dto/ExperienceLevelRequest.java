package iuh.fit.se.masterdata.experiencelevel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record ExperienceLevelRequest(
        @NotBlank(message = "Tên mức kinh nghiệm không được để trống") String name,
        @NotNull @PositiveOrZero Integer minYears,
        @NotNull @PositiveOrZero Integer maxYears
) {}