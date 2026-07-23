package iuh.fit.se.masterdata.contracttype.dto;

import jakarta.validation.constraints.NotBlank;

public record ContractTypeRequest(
        @NotBlank(message = "Tên loại hợp đồng không được để trống") String name
) {}