package iuh.fit.se.application.event;

public record OfferAcceptedEvent(
        Long offerId, Long applicationId, Long requesterId, String candidateName,
        Long candidateUserId
) {}
