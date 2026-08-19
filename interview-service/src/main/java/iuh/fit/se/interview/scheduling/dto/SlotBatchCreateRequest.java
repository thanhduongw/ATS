package iuh.fit.se.interview.scheduling.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SlotBatchCreateRequest(
        @NotNull(message = "applicationId không được để trống")
        Long applicationId,
        @NotNull(message = "Hình thức phỏng vấn không được để trống")
        InterviewFormat format,
        String location,
        String meetingLink,
        @NotEmpty(message = "Danh sách khung giờ không được để trống")
        List<@Valid SlotTimeDto> slots
) {}
