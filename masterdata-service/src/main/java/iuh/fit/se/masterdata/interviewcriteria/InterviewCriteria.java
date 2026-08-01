package iuh.fit.se.masterdata.interviewcriteria;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "interview_criteria")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewCriteria {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        if (!active) active = true;
    }
}