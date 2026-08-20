package iuh.fit.se.candidate.candidate;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "candidate")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Candidate {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    private String gender;

    private String address;

    @Column(name = "current_position")
    private String currentPosition;

    @Column(name = "education_level_id")
    private Long educationLevelId;

    @Column(name = "cv_file_url")
    private String cvFileUrl;

    /** Ghi chú nội bộ — chỉ HR/Manager thấy, không hiển thị cho candidate. */
    @Column(name = "internal_note", columnDefinition = "TEXT")
    private String internalNote;

    /** Talent Pool: IN_POOL khi ứng viên bị từ chối ở 1 vị trí nhưng có thể phù hợp vị trí khác sau này. */
    @Enumerated(EnumType.STRING)
    @Column(name = "pool_status", nullable = false)
    @Builder.Default
    private PoolStatus poolStatus = PoolStatus.ACTIVE;

    /** GDPR: ứng viên đồng ý cho lưu trữ dữ liệu khi nộp hồ sơ (bắt buộc ở luồng public apply). */
    @Column(name = "consent_given")
    private boolean consentGiven;

    @Column(name = "consent_at")
    private LocalDateTime consentAt;

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CandidateTag> tags = new ArrayList<>();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CandidateSkill> skills = new ArrayList<>();

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