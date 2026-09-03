package iuh.fit.se.notification.event;

public record OfferApprovedEvent(
        Long offerId,
        Long applicationId,
        Long requesterId,
        Long candidateId
) {}