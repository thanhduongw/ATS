package iuh.fit.se.candidate.offer;

import iuh.fit.se.candidate.application.Application;
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

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "salary_offered", nullable = false)
    private BigDecimal salaryOffered;

    @Column(name = "contract_type_id", nullable = false)
    private Long contractTypeId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "probation_months")
    private Integer probationMonths;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    private BigDecimal allowance;

    @Column(columnDefinition = "TEXT")
    private String note;

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