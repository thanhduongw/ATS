package iuh.fit.se.interview.interview.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;
import java.util.List;

public record InterviewCreateRequest(
        @NotNull(message = "Vui lòng chọn hồ sơ ứng tuyển") Long applicationId,
        @NotNull(message = "Vui lòng chọn thời gian phỏng vấn") LocalDateTime scheduledAt,
        @NotNull @Positive(message = "Thời lượng phải lớn hơn 0") Integer durationMinutes,
        @NotNull(message = "Vui lòng chọn hình thức phỏng vấn") InterviewFormat format,
        String location,
        String meetingLink,
        String note,
        @NotEmpty(message = "Phải chọn ít nhất 1 người phỏng vấn") List<Long> interviewerIds
) {}