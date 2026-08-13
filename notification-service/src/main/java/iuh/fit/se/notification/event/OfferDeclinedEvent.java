package iuh.fit.se.notification.event;

public record OfferDeclinedEvent(
        Long tenantId, Long offerId, Long applicationId, Long requesterId, String candidateName, String note
) {}