package iuh.fit.se.masterdata.worklocation.dto;

import jakarta.validation.constraints.NotBlank;

public record WorkLocationRequest(
        @NotBlank(message = "Tên địa điểm làm việc không được để trống") String name,
        String address
) {}