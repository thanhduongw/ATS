package iuh.fit.se.notification.event;

public record OfferAcceptedEvent(
        Long offerId, Long applicationId, Long requesterId, String candidateName,
        Long candidateUserId,
        /** Tên vị trí trên thư mời (offer-service gửi kèm; bản cũ không có thì null). */
        String jobTitle
) {}
