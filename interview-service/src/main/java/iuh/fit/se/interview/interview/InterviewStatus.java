package iuh.fit.se.interview.interview;

import java.util.EnumSet;

/**
 * Vòng đời buổi phỏng vấn — xác nhận hai tầng: HM trước, ứng viên sau.
 *
 * <pre>
 *   SCHEDULED ──HM xác nhận──────────────► HM_CONFIRMED ──ứng viên xác nhận──► CANDIDATE_CONFIRMED
 *       │                                      ▲                                    │
 *       │ HM từ chối kèm đề xuất giờ khác      │ HR duyệt đề xuất                   │ quá giờ mà thiếu đánh giá
 *       ▼                                      │                                    ▼
 *   HM_RESCHEDULE_PROPOSED ───────────────────┘                             EVALUATION_PENDING
 *       │                                                                           │
 *       │ HM từ chối không kèm đề xuất                    đủ phiếu đánh giá ────────┤
 *       ▼                                                                           ▼
 *   CANCELLED ◄── HR hủy (từ 4 trạng thái đầu)                                  COMPLETED
 *                                                    HM ghi nhận vắng ──────► NO_SHOW
 * </pre>
 */
public enum InterviewStatus {
    /** HR vừa tạo lịch, đang chờ HM xác nhận. Ứng viên chưa thấy. */
    SCHEDULED,

    /** HM từ chối giờ HR đặt và đề xuất giờ khác, chờ HR duyệt. Ứng viên chưa thấy. */
    HM_RESCHEDULE_PROPOSED,

    /** HM đã chốt giờ — đây là lúc ứng viên được thông báo và nhìn thấy lịch. */
    HM_CONFIRMED,

    /** Ứng viên đã xác nhận sẽ tham dự. */
    CANDIDATE_CONFIRMED,

    /** Đã quá giờ kết thúc mà chưa đủ phiếu đánh giá. */
    EVALUATION_PENDING,

    /** Tất cả HM được phân công đã nộp đánh giá. */
    COMPLETED,

    /** Ứng viên đã xác nhận nhưng không đến. HM ghi nhận thủ công. */
    NO_SHOW,

    /** Hủy bởi HR, hoặc tự động khi HM từ chối mà không đề xuất giờ thay thế. */
    CANCELLED;

    /**
     * Các trạng thái còn chiếm chỗ trên lịch của người phỏng vấn — dùng để phát hiện
     * trùng lịch. Buổi đã COMPLETED/NO_SHOW/CANCELLED thì không chặn giờ nữa.
     */
    public static final EnumSet<InterviewStatus> BLOCKING = EnumSet.of(
            SCHEDULED, HM_RESCHEDULE_PROPOSED, HM_CONFIRMED, CANDIDATE_CONFIRMED, EVALUATION_PENDING);

    /** Trạng thái HR còn hủy được. */
    public static final EnumSet<InterviewStatus> CANCELLABLE = EnumSet.of(
            SCHEDULED, HM_RESCHEDULE_PROPOSED, HM_CONFIRMED, CANDIDATE_CONFIRMED);

    /** Trạng thái còn dời lịch được. */
    public static final EnumSet<InterviewStatus> RESCHEDULABLE = EnumSet.of(
            SCHEDULED, HM_CONFIRMED, CANDIDATE_CONFIRMED);

    /** Buổi đã diễn ra (hoặc đáng lẽ đã diễn ra) — nơi đánh giá và no-show có nghĩa. */
    public static final EnumSet<InterviewStatus> HELD = EnumSet.of(
            CANDIDATE_CONFIRMED, EVALUATION_PENDING);

    /**
     * Ứng viên chỉ được nhìn thấy buổi phỏng vấn từ khi HM chốt giờ trở đi — trước đó
     * giờ giấc còn đang thương lượng nội bộ.
     *
     * <p>EVALUATION_PENDING vẫn hiện với ứng viên vì buổi đó đã diễn ra thật, ẩn đi thì
     * lịch sử của họ bị mất một dòng. Giao diện cổng ứng viên dịch nó thành "Đã diễn ra"
     * để không lộ chuyện nội bộ đang chờ ai chấm điểm.
     */
    public boolean visibleToCandidate() {
        return this != SCHEDULED && this != HM_RESCHEDULE_PROPOSED;
    }

    public boolean isBlocking() {
        return BLOCKING.contains(this);
    }
}
