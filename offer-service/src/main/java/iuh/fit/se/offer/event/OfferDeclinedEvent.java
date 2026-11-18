package iuh.fit.se.offer.event;

public record OfferDeclinedEvent(
        Long offerId, Long applicationId, Long requesterId, String candidateName, String note,
        Long declineReasonId, Long candidateUserId,
        /** Tên vị trí (snapshot trên thư mời) — để câu thông báo ghi rõ vị trí. */
        String jobTitle
) {}
