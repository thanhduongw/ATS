package iuh.fit.se.candidate.offer.dto;

import iuh.fit.se.candidate.offer.OfferStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record OfferResponse(
        Long id,
        Long applicationId,
        String candidateName,
        BigDecimal salaryOffered,
        Long contractTypeId,
        String contractTypeName,
        LocalDate startDate,
        Integer probationMonths,
        String benefits,
        BigDecimal allowance,
        String note,
        Long requesterId,
        String requesterName,
        Long approverId,
        String approverName,
        OfferStatus status,
        String rejectReason,
        String declineReasonName,
        String declineNote,
        LocalDateTime createdAt
) {}