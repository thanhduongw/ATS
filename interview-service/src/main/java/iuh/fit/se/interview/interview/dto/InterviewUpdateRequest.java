package iuh.fit.se.interview.interview.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

/** HR dời lịch tại chỗ — không lưu lịch sử các lần dời. */
public record InterviewUpdateRequest(
        @NotNull(message = "Vui lòng chọn thời gian phỏng vấn") LocalDateTime scheduledAt,
        @NotNull @Positive(message = "Thời lượng phải lớn hơn 0") Integer durationMinutes,
        @NotNull(message = "Vui lòng chọn hình thức phỏng vấn") InterviewFormat format,
        Long workLocationId,
        String meetingLink,
        String note
) {}
