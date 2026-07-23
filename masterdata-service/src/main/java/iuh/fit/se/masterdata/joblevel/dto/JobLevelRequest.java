package iuh.fit.se.masterdata.joblevel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record JobLevelRequest(
        @NotBlank(message = "Tên cấp bậc không được để trống") String name,
        @NotNull(message = "Thứ tự cấp bậc không được để trống") Integer orderNo
) {}