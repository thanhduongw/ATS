package iuh.fit.se.notification.event;

public record ApplicationCommentMentionEvent(
        Long applicationId,
        Long mentionedUserId,
        Long authorUserId,
        String authorName,
        String commentExcerpt
) {}
