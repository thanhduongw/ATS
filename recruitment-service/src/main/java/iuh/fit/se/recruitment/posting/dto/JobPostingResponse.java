package iuh.fit.se.recruitment.posting.dto;

import iuh.fit.se.recruitment.posting.PostingStatus;
import iuh.fit.se.recruitment.requisition.WorkArrangement;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record JobPostingResponse(
        Long id,
        Long requisitionId,
        String title,
        Long employmentTypeId,
        Long workLocationId,
        WorkArrangement workArrangement,
        String experienceRequired,
        Long pipelineId,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String description,
        String requirements,
        String benefits,
        List<Long> skillIds,
        PostingStatus status,
        boolean pipelineLocked,
        LocalDateTime publishedAt,
        LocalDateTime closedAt,
        /** Chỉ populate ở luồng public (career portal); null ở luồng nội bộ HR. */
        String employmentTypeName,
        String workLocationName,
        Long departmentId,
        String departmentName
) {}