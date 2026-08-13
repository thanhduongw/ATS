package iuh.fit.se.notification.event;

public record OfferAcceptedEvent(
        Long tenantId, Long offerId, Long applicationId, Long requesterId, String candidateName
) {}