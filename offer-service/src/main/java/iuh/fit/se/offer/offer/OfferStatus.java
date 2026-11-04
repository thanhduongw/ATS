package iuh.fit.se.offer.offer;

public enum OfferStatus {
    DRAFT,
    PENDING_APPROVAL,
    /** Đã gửi cho ứng viên (giữ tên cũ; DB V5 có thêm SENT nhưng code chưa dùng). */
    APPROVED,
    REJECTED,
    ACCEPTED,
    DECLINED,
    /** Quá hạn phản hồi mà ứng viên chưa trả lời (docs/UI R25; DB V5 ck_offer_status đã cho phép). */
    EXPIRED
}
