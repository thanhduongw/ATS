package iuh.fit.se.interview.interview.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import iuh.fit.se.interview.interview.InterviewStatus;

import java.time.LocalDateTime;
import java.util.List;

public record InterviewResponse(
        Long id,
        Long applicationId,
        /** Can cho giao dien dieu huong sang trang ho so ung tuyen cua ung vien. */
        Long candidateId,
        String candidateName,
        LocalDateTime scheduledAt,
        Integer durationMinutes,
        InterviewFormat format,
        Long workLocationId,
        String meetingLink,
        String note,
        InterviewStatus status,
        boolean candidateConfirmed,
        List<InterviewerSummary> interviewers,
        /**
         * Moc tao buoi phong van. Giao dien dung no doi chieu voi lich su chuyen vong cua
         * ho so de suy ra buoi nay thuoc vong nao — he thong khong luu vong tren interview.
         */
        LocalDateTime createdAt
) {}