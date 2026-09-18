package iuh.fit.se.offer.offer.dto;

import iuh.fit.se.offer.offer.OfferStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CandidateOfferResponse(
        Long id,
        Long applicationId,
        String candidateName,
        /** Ten vi tri — ung vien can thay viec minh ung tuyen, khong phai ma ho so. */
        String jobTitle,
        BigDecimal salaryOffered,
        Long contractTypeId,
        String contractTypeName,
        LocalDate startDate,
        Integer probationMonths,
        LocalDateTime responseDeadline,
        String benefits,
        BigDecimal allowance,
        /** Ghi chu noi bo khong bao gio xuat hien o day; chi ghi chu danh cho ung vien. */
        String candidateVisibleNote,
        OfferStatus status,
        String declineReasonName,
        String declineNote,
        LocalDateTime createdAt
) {}
