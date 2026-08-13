package iuh.fit.se.offer.event;

public record OfferDeclinedEvent(
        Long tenantId, Long offerId, Long applicationId, Long requesterId, String candidateName, String note
) {}