package iuh.fit.se.application.event;

public record ApplicationCommentMentionEvent(
        Long applicationId,
        Long mentionedUserId,
        Long authorUserId,
        String authorName,
        String commentExcerpt
) {}
