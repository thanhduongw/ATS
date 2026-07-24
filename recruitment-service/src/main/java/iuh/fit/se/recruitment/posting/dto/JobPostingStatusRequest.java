package iuh.fit.se.recruitment.posting.dto;

import iuh.fit.se.recruitment.posting.PostingStatus;
import jakarta.validation.constraints.NotNull;

public record JobPostingStatusRequest(
        @NotNull(message = "Vui lòng chọn trạng thái") PostingStatus status
) {}