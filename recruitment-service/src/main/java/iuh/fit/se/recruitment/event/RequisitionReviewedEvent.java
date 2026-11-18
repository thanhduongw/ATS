package iuh.fit.se.recruitment.event;

/**
 * Chuyên viên tuyển dụng đã xử lý một yêu cầu tuyển dụng — báo cho người lập yêu cầu (đại diện phòng ban).
 *
 * @param outcome {@code APPROVED} | {@code REJECTED} | {@code CHANGES_REQUESTED}
 * @param note    lý do từ chối / nội dung cần sửa / ghi chú khi duyệt (có thể null)
 */
public record RequisitionReviewedEvent(
        Long requisitionId,
        Long requesterId,
        String title,
        String outcome,
        String note
) {}
