package iuh.fit.se.offer.offer.dto;

import jakarta.validation.constraints.NotBlank;

public record OfferRejectRequest(
        @NotBlank(message = "Vui lòng nhập lý do từ chối") String reason
) {}
