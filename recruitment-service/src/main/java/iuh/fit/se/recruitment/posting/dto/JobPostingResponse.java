package iuh.fit.se.recruitment.posting.dto;

import iuh.fit.se.recruitment.posting.PostingStatus;

import java.time.LocalDateTime;

public record JobPostingResponse(
        Long id,
        Long requisitionId,
        String title,
        Long employmentTypeId,
        Long workLocationId,
        Long pipelineId,
        String description,
        String requirements,
        String benefits,
        PostingStatus status,
        boolean pipelineLocked,
        LocalDateTime publishedAt,
        LocalDateTime closedAt
) {}