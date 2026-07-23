package iuh.fit.se.masterdata.recruitmentstatus.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecruitmentStatusRequest(
        @NotBlank(message = "Tên trạng thái không được để trống") String name,
        @NotNull(message = "Thứ tự không được để trống") Integer orderNo
) {}