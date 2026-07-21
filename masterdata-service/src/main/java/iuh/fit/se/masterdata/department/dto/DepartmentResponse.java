package iuh.fit.se.masterdata.department.dto;

public record DepartmentResponse(
        Long id,
        String name,
        String description,
        boolean active
) {}