package iuh.fit.se.auth.dto.response;

import java.time.LocalDateTime;

/**
 * Trang tuyển dụng. Quản trị nhận cả bản nháp lẫn bản đã xuất bản; công khai chỉ nhận `publishedConfig`
 * (`draftConfig` để null). Cấu hình là chuỗi JSON.
 */
public record CareersPageResponse(
        String draftConfig,
        String publishedConfig,
        LocalDateTime draftUpdatedAt,
        LocalDateTime publishedAt,
        boolean hasUnpublishedChanges
) {}
