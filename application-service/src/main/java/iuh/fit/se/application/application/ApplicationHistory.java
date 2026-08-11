package iuh.fit.se.application.application;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "application_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApplicationHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "from_stage_name")
    private String fromStageName;

    @Column(name = "to_stage_name", nullable = false)
    private String toStageName;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "changed_by_user_id")
    private Long changedByUserId;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @PrePersist
    void prePersist() {
        changedAt = LocalDateTime.now();
    }
}
