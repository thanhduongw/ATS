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

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

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

    private String location;

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
