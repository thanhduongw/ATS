package iuh.fit.se.notification.event;

/**
 * recruitment-service: chuyên viên tuyển dụng đã xử lý yêu cầu tuyển dụng.
 *
 * @param outcome {@code APPROVED} | {@code REJECTED} | {@code CHANGES_REQUESTED}
 */
public record RequisitionReviewedEvent(
        Long requisitionId,
        Long requesterId,
        String title,
        String outcome,
        String note
) {}
