package iuh.fit.se.candidate.application.dto;

import java.time.LocalDateTime;

public record ApplicationHistoryResponse(
        Long id, String fromStageName, String toStageName, String note,
        Long changedByUserId, String changedByUserName, LocalDateTime changedAt
) {}