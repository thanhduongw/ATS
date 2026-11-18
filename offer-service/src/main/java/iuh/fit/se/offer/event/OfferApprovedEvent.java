package iuh.fit.se.offer.event;

public record OfferApprovedEvent(
        Long offerId,
        Long applicationId,
        Long requesterId,
        Long candidateId,
        /** Tên vị trí (snapshot trên thư mời) — để câu thông báo ghi rõ vị trí. */
        String jobTitle
) {}