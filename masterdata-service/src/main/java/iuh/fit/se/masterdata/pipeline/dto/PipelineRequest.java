package iuh.fit.se.masterdata.pipeline.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record PipelineRequest(
        @NotBlank(message = "Tên quy trình không được để trống") String name,
        @NotEmpty(message = "Quy trình phải có ít nhất 1 giai đoạn")
        @Valid
        List<PipelineStageRequest> stages
) {}