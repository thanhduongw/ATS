package iuh.fit.se.masterdata.experiencelevel;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "experience_level")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExperienceLevel {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private String name;

    @Column(name = "min_years")
    private Integer minYears;

    @Column(name = "max_years")
    private Integer maxYears;

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