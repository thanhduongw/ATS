package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Lưu bản nháp trang tuyển dụng (cấu hình JSON, tối đa ~200KB — ảnh chỉ là đường dẫn). */
public record CareersPageDraftRequest(
        @NotBlank(message = "Thiếu cấu hình trang")
        @Size(max = 200_000, message = "Cấu hình trang quá lớn")
        String config
) {}
