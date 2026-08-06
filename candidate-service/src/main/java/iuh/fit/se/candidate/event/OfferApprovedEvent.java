package iuh.fit.se.candidate.event;

public record OfferApprovedEvent(Long tenantId, Long offerId, Long applicationId, Long requesterId) {}