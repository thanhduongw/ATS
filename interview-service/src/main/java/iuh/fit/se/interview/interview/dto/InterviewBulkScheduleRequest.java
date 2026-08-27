package iuh.fit.se.interview.interview.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;
import java.util.List;

public record InterviewBulkScheduleRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất 1 hồ sơ ứng tuyển") List<Long> applicationIds,
        @NotNull(message = "Vui lòng chọn thời gian bắt đầu") LocalDateTime startTime,
        @NotNull @Positive(message = "Thời lượng mỗi người phải lớn hơn 0") Integer durationMinutesPerPerson,
        @NotNull(message = "Vui lòng chọn hình thức phỏng vấn") InterviewFormat format,
        Long workLocationId,
        String meetingLink,
        @NotEmpty(message = "Phải chọn ít nhất 1 người phỏng vấn") List<Long> interviewerIds,
        String note
) {}
