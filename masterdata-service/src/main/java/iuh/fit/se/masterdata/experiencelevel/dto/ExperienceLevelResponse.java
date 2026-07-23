package iuh.fit.se.masterdata.experiencelevel.dto;

public record ExperienceLevelResponse(
        Long id, String name, Integer minYears, Integer maxYears, boolean active
) {}