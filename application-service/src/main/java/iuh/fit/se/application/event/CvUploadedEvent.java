package iuh.fit.se.application.event;

/**
 * Event published to ai-service when a new application with a CV is created.
 * The ai-service listens on {@code ai.cv-uploaded.queue} and triggers the
 * full CV processing pipeline (text extraction → LLM → chunking → embedding → pgvector).
 */
public record CvUploadedEvent(
        Long applicationId,
        Long candidateId,
        Long jobPostingId,
        String cvFileUrl
) {}
