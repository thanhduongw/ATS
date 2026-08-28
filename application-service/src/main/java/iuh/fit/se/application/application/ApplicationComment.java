package iuh.fit.se.application.application;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "application_comment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApplicationComment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
