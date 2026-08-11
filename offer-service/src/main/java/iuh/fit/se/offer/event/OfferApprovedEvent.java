package iuh.fit.se.offer.event;

public record OfferApprovedEvent(Long tenantId, Long offerId, Long applicationId, Long requesterId) {}
