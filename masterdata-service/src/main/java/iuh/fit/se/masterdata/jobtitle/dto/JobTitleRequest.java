package iuh.fit.se.masterdata.jobtitle.dto;

import jakarta.validation.constraints.NotBlank;

public record JobTitleRequest(
        @NotBlank(message = "Tên chức vụ không được để trống") String name
) {}