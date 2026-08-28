package iuh.fit.se.application.application.dto;

import java.time.LocalDateTime;

public record ApplicationCommentResponse(
        Long id,
        String content,
        Long authorUserId,
        String authorUserName,
        LocalDateTime createdAt
) {}
