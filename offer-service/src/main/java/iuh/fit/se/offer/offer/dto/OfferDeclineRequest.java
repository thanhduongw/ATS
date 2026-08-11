package iuh.fit.se.offer.offer.dto;

import jakarta.validation.constraints.NotNull;

public record OfferDeclineRequest(
        @NotNull(message = "Vui lòng chọn lý do từ chối") Long declineReasonId,
        String note
) {}
