package iuh.fit.se.offer.offer.dto;

/**
 * Ứng viên từ chối thư mời. {@code declineReasonId} (danh mục "Lý do từ chối" của công ty) không bắt buộc:
 * lý do của ứng viên (ví dụ "Lý do cá nhân") không phải lúc nào cũng có trong danh mục — khi đó lời ứng viên chọn
 * nằm ở {@code note}.
 */
public record OfferDeclineRequest(
        Long declineReasonId,
        String note
) {}
