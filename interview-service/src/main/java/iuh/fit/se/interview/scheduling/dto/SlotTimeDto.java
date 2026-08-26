package iuh.fit.se.interview.scheduling.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record SlotTimeDto(
        @NotNull(message = "Thời gian bắt đầu không được để trống")
        LocalDateTime startTime,
        @NotNull(message = "Thời gian kết thúc không được để trống")
        LocalDateTime endTime
) {}
