package iuh.fit.se.masterdata.emailtemplate.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailTemplateRequest(
        @NotBlank(message = "Mã mẫu email không được để trống") String code,
        @NotBlank(message = "Tiêu đề không được để trống") String subject,
        @NotBlank(message = "Nội dung không được để trống") String body
) {}