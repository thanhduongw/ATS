package iuh.fit.se.notification.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

/** Mục 4.4: interview-service báo đến lúc nhắc lịch (trước 24 giờ hoặc 1 giờ). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record InterviewReminderEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        int hoursBefore,
        String format,
        String meetingLink,
        Long workLocationId
) {}
