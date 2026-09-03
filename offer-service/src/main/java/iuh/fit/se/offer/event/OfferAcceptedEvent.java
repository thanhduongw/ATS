package iuh.fit.se.offer.event;

public record OfferAcceptedEvent(
        Long offerId, Long applicationId, Long requesterId, String candidateName,
        Long candidateUserId
) {}
