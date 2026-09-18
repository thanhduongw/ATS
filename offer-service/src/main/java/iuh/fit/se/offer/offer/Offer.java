package iuh.fit.se.offer.offer;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "offer")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Offer {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    /**
     * Snapshot tu application — dung de dem so offer da phat hanh cho mot tin tuyen dung.
     * Cot nay do ddl-auto tao chu khong co migration rieng: lich su Flyway cua ats_offer dang
     * chua V4..V7 tu mot nhanh khac, nen them file migration moi se lam validate that bai.
     */
    @Column(name = "job_posting_id")
    private Long jobPostingId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "assigned_recruiter_id")
    private Long assignedRecruiterId;

    /** Filter offer cho Candidate */
    @Column(name = "candidate_id")
    private Long candidateId;

    @Column(name = "candidate_name_snapshot")
    private String candidateNameSnapshot;

    /** Snapshot lien he va vi tri de danh sach offer khong phai goi cheo service. */
    @Column(name = "candidate_email_snapshot")
    private String candidateEmailSnapshot;

    @Column(name = "candidate_phone_snapshot")
    private String candidatePhoneSnapshot;

    @Column(name = "job_title_snapshot")
    private String jobTitleSnapshot;

    @Column(name = "salary_offered", nullable = false)
    private BigDecimal salaryOffered;

    @Column(name = "contract_type_id", nullable = false)
    private Long contractTypeId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "probation_months")
    private Integer probationMonths;

    /** Người quản lý trực tiếp của vị trí — in trên thư mời. */
    @Column(name = "reporting_manager")
    private String reportingManager;

    /** Địa điểm làm việc chốt trong đề nghị; mặc định lấy theo tin tuyển dụng. */
    @Column(name = "work_location_id")
    private Long workLocationId;

    /** VND hoặc USD. */
    @Column(name = "currency", length = 8)
    private String currency;

    /** MONTHLY hoặc YEARLY — mức lương ở trên tính theo chu kỳ nào. */
    @Column(name = "pay_frequency", length = 16)
    private String payFrequency;

    /** Thưởng hiệu suất, để dạng chữ vì thực tế hay thỏa thuận theo phần trăm. */
    @Column(name = "performance_bonus")
    private String performanceBonus;

    @Column(name = "annual_leave_days")
    private Integer annualLeaveDays;

    @Column(name = "response_deadline")
    private LocalDateTime responseDeadline;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    private BigDecimal allowance;

    /** Ghi chu noi bo: chi HR va COMPANY_ADMIN doc duoc, khong bao gio gui cho ung vien. */
    @Column(columnDefinition = "TEXT")
    private String note;

    /** Ghi chu in tren thu moi nhan viec — day la phan duy nhat ung vien doc duoc. */
    @Column(name = "candidate_visible_note", columnDefinition = "TEXT")
    private String candidateVisibleNote;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "approver_id", nullable = false)
    private Long approverId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferStatus status;

    @Column(name = "reject_reason")
    private String rejectReason;

    @Column(name = "decline_reason_id")
    private Long declineReasonId;

    @Column(name = "decline_note")
    private String declineNote;

    /** Moc gui duyet va moc duyet — hien tren the "Thong tin phe duyet" cua chi tiet offer. */
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

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
