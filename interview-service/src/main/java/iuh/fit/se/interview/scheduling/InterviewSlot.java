package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.interview.InterviewFormat;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "interview_slot")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "candidate_name_snapshot", nullable = false)
    private String candidateNameSnapshot;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewFormat format;

    @Column(name = "work_location_id")
    private Long workLocationId;

    @Column(name = "meeting_link")
    private String meetingLink;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterviewSlotStatus status;

    @Column(name = "department_confirmed", nullable = false)
    @Builder.Default
    private boolean departmentConfirmed = false;

    @Column(name = "candidate_confirmed", nullable = false)
    @Builder.Default
    private boolean candidateConfirmed = false;

    @Column(name = "matched", nullable = false)
    @Builder.Default
    private boolean matched = false;

    /** Người phỏng vấn HR chọn khi gửi khung giờ, dạng "4,7" (R18). Trống → mặc định đại diện phòng ban. */
    @Column(name = "interviewer_ids")
    private String interviewerIds;

    /** Ghi chú cho ứng viên (R18), chuyển sang buổi phỏng vấn khi HR chốt. */
    @Column(columnDefinition = "TEXT")
    private String note;

    /** Hạn ứng viên chọn giờ (R18, C13, C25). */
    @Column(name = "response_deadline")
    private LocalDateTime responseDeadline;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
