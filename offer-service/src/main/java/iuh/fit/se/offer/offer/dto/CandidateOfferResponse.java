package iuh.fit.se.offer.offer.dto;

import iuh.fit.se.offer.offer.OfferStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CandidateOfferResponse(
        Long id,
        Long applicationId,
        String candidateName,
        BigDecimal salaryOffered,
        Long contractTypeId,
        String contractTypeName,
        LocalDate startDate,
        Integer probationMonths,
        LocalDateTime responseDeadline,
        String benefits,
        BigDecimal allowance,
        String note,
        OfferStatus status,
        String declineReasonName,
        String declineNote,
        LocalDateTime createdAt
) {}
