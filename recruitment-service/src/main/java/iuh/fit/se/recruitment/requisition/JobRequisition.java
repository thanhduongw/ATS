package iuh.fit.se.recruitment.requisition;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_requisition")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobRequisition {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String title;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Column(name = "job_title_id", nullable = false)
    private Long jobTitleId;

    @Column(name = "job_level_id")
    private Long jobLevelId;

    @Column(nullable = false)
    private Integer quantity;

    private BigDecimal budget;

    @Column(name = "expected_salary_min")
    private BigDecimal expectedSalaryMin;

    @Column(name = "expected_salary_max")
    private BigDecimal expectedSalaryMax;

    @Column(name = "expected_start_date")
    private LocalDate expectedStartDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "approver_id", nullable = false)
    private Long approverId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequisitionStatus status;

    @Column(name = "reject_reason")
    private String rejectReason;

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