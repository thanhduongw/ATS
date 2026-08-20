package iuh.fit.se.recruitment.requisition;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "employment_type_id")
    private Long employmentTypeId;

    @Column(name = "work_location_id")
    private Long workLocationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_arrangement")
    private WorkArrangement workArrangement;

    @Column(name = "experience_required")
    private String experienceRequired;

    @Enumerated(EnumType.STRING)
    private RequisitionReason reason;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RequisitionPriority priority = RequisitionPriority.NORMAL;

    /** Ghi chú của phòng ban gửi kèm khi tạo/gửi yêu cầu (khác với hrNote của HR). */
    @Column(columnDefinition = "TEXT")
    private String note;

    private BigDecimal budget;

    @Column(name = "expected_salary_min")
    private BigDecimal expectedSalaryMin;

    @Column(name = "expected_salary_max")
    private BigDecimal expectedSalaryMax;

    /** Mức lương do HR chốt duyệt — có thể khác với mức phòng ban đề xuất (expectedSalaryMin/Max). */
    @Column(name = "approved_salary_min")
    private BigDecimal approvedSalaryMin;

    @Column(name = "approved_salary_max")
    private BigDecimal approvedSalaryMax;

    @Column(name = "expected_start_date")
    private LocalDate expectedStartDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @ElementCollection
    @CollectionTable(name = "job_requisition_skill", joinColumns = @JoinColumn(name = "requisition_id"))
    @Column(name = "skill_id")
    @Builder.Default
    private List<Long> skillIds = new ArrayList<>();

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "approver_id", nullable = false)
    private Long approverId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequisitionStatus status;

    @Column(name = "reject_reason")
    private String rejectReason;

    /** Ghi chú của HR khi duyệt (điều chỉnh lương) hoặc khi yêu cầu chỉnh sửa lại. */
    @Column(name = "hr_note", columnDefinition = "TEXT")
    private String hrNote;

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
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}