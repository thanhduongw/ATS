package iuh.fit.se.interview.scheduling;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "salary_proposal")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "interview_id")
    private Long interviewId;

    @Column(name = "proposed_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal proposedSalary;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "proposed_by_id", nullable = false)
    private Long proposedById;

    @Column(name = "proposed_by_name", nullable = false)
    private String proposedByName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SalaryProposalStatus status;

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
