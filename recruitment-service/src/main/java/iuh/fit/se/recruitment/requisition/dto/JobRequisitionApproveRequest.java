package iuh.fit.se.recruitment.requisition.dto;

import java.math.BigDecimal;

/**
 * HR có thể chốt lại khoảng lương khi duyệt (khác với khoảng lương phòng ban đề xuất).
 * Nếu để trống, hệ thống mặc định lấy theo khoảng lương phòng ban đã đề xuất.
 */
public record JobRequisitionApproveRequest(
        BigDecimal approvedSalaryMin,
        BigDecimal approvedSalaryMax,
        String note
) {}
