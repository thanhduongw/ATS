package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.requisition.JobRequisition;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_posting")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobPosting {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requisition_id", nullable = false)
    private JobRequisition requisition;

    @Column(nullable = false)
    private String title;

    @Column(name = "employment_type_id", nullable = false)
    private Long employmentTypeId;

    @Column(name = "work_location_id", nullable = false)
    private Long workLocationId;

    @Column(name = "pipeline_id", nullable = false)
    private Long pipelineId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostingStatus status;

    @Column(name = "pipeline_locked", nullable = false)
    private boolean pipelineLocked;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

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