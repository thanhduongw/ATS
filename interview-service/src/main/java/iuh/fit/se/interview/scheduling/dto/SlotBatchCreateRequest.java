package iuh.fit.se.interview.scheduling.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public record SlotBatchCreateRequest(
        @NotNull(message = "applicationId không được để trống")
        Long applicationId,
        @NotNull(message = "Hình thức phỏng vấn không được để trống")
        InterviewFormat format,
        Long workLocationId,
        String meetingLink,
        @NotEmpty(message = "Danh sách khung giờ không được để trống")
        List<@Valid SlotTimeDto> slots,
        /** Người phỏng vấn (R18); bỏ trống thì khi chốt lấy đại diện phòng ban của hồ sơ. */
        List<Long> interviewerIds,
        String note,
        LocalDateTime responseDeadline
) {}
