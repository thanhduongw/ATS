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
        /**
         * Tin tuyển dụng và phòng ban của hồ sơ. Chỉ trả về id — giao diện tự ghép tên từ
         * danh sách tin và danh sách phòng ban mà nó vốn đã nạp để dựng bộ lọc, nên không
         * cần lưu snapshot tên lẫn gọi chéo sang service khác lúc đọc.
         */
        Long jobPostingId,
        Long departmentId,
        LocalDateTime scheduledAt,
        Integer durationMinutes,
        InterviewFormat format,
        Long workLocationId,
        String meetingLink,
        String note,
        InterviewStatus status,
        boolean candidateConfirmed,
        boolean hmConfirmed,
        /** Nhóm các buổi tạo cùng một lần; null nếu tạo lẻ. Trạng thái vẫn độc lập từng buổi. */
        Long sessionId,
        /** Giờ HM đề xuất thay thế — chỉ có giá trị khi status = HM_RESCHEDULE_PROPOSED. */
        LocalDateTime proposedScheduledAt,
        String proposalNote,
        List<InterviewerSummary> interviewers,
        /**
         * Moc tao buoi phong van. Giao dien dung no doi chieu voi lich su chuyen vong cua
         * ho so de suy ra buoi nay thuoc vong nao — he thong khong luu vong tren interview.
         */
        LocalDateTime createdAt
) {}