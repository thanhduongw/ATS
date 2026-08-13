package iuh.fit.se.offer.event;

public record OfferAcceptedEvent(
        Long tenantId, Long offerId, Long applicationId, Long requesterId, String candidateName
) {}