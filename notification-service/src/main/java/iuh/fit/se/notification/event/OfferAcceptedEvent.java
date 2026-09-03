package iuh.fit.se.notification.event;

public record OfferAcceptedEvent(
        Long offerId, Long applicationId, Long requesterId, String candidateName,
        Long candidateUserId
) {}
