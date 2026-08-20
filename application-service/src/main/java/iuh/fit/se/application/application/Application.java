package iuh.fit.se.application.application;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "application")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Application {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    @Column(name = "candidate_name_snapshot", nullable = false)
    private String candidateNameSnapshot;

    @Column(name = "candidate_email_snapshot")
    private String candidateEmailSnapshot;

    @Column(name = "job_posting_id", nullable = false)
    private Long jobPostingId;

    @Column(name = "recruitment_source_id", nullable = false)
    private Long recruitmentSourceId;

    @Column(name = "assigned_recruiter_id")
    private Long assignedRecruiterId;

    @Column(name = "resume_url")
    private String resumeUrl;

    @Column(name = "current_stage_id", nullable = false)
    private Long currentStageId;

    @Column(name = "current_stage_name", nullable = false)
    private String currentStageName;

    @Column(name = "current_stage_order", nullable = false)
    private Integer currentStageOrder;

    @Column(name = "current_stage_type", nullable = false)
    private String currentStageType;

    @Column(name = "rejection_reason_id")
    private Long rejectionReasonId;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    /** Thời điểm chuyển sang stage type HIRED — dùng tính Time-to-Hire. */
    @Column(name = "hired_at")
    private LocalDateTime hiredAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        appliedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
