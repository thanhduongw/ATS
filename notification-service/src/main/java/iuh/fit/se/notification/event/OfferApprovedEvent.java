package iuh.fit.se.notification.event;

public record OfferApprovedEvent(
        Long offerId,
        Long applicationId,
        Long requesterId,
        Long candidateId,
        /** Tên vị trí trên thư mời (offer-service gửi kèm; bản cũ không có thì null). */
        String jobTitle
) {}