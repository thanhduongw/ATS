package iuh.fit.se.interview.interview;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interview")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Interview {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "job_posting_id", nullable = false)
    private Long jobPostingId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "assigned_recruiter_id")
    private Long assignedRecruiterId;

    /** Dùng filter lịch cho Candidate */
    @Column(name = "candidate_id")
    private Long candidateId;

    @Column(name = "candidate_name_snapshot", nullable = false)
    private String candidateNameSnapshot;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewFormat format;

    @Column(name = "work_location_id")
    private Long workLocationId;

    @Column(name = "meeting_link")
    private String meetingLink;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewStatus status;

    @Column(name = "candidate_confirmed_at")
    private LocalDateTime candidateConfirmedAt;

    /** Cột đã có sẵn trong schema — mốc HM chốt giờ, cũng là lúc ứng viên được thông báo. */
    @Column(name = "hm_confirmed_at")
    private LocalDateTime hmConfirmedAt;

    /**
     * Nhóm các buổi được tạo cùng một lần/cùng khung giờ để giao diện gom lại.
     * Trạng thái vẫn độc lập từng buổi — no-show và đánh giá là theo từng ứng viên.
     */
    @Column(name = "session_id")
    private Long sessionId;

    /** Giờ HM đề xuất thay thế, chỉ có nghĩa khi status = HM_RESCHEDULE_PROPOSED. */
    @Column(name = "proposed_scheduled_at")
    private LocalDateTime proposedScheduledAt;

    /** Lý do HM từ chối giờ HR đặt. */
    @Column(name = "proposal_note", length = 500)
    private String proposalNote;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "interview", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InterviewInterviewer> interviewers = new ArrayList<>();

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
