package iuh.fit.se.offer.event;

public record OfferApprovedEvent(
        Long offerId,
        Long applicationId,
        Long requesterId,
        Long candidateId
) {}