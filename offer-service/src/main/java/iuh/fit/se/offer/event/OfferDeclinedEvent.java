package iuh.fit.se.offer.event;

public record OfferDeclinedEvent(
        Long offerId, Long applicationId, Long requesterId, String candidateName, String note,
        Long declineReasonId, Long candidateUserId
) {}
