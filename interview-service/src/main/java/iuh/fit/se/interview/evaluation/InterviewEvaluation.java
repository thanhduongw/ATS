package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.interview.Interview;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interview_evaluation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewEvaluation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Buoi phong van duoc cham. De trong khi danh gia thuoc mot vong khong co phong van
     * (vi du HR cham o vong Sang loc CV).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id")
    private Interview interview;

    /** Ho so ung tuyen ma danh gia nay thuoc ve — luon co, ke ca khi khong gan buoi phong van. */
    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "interviewer_id", nullable = false)
    private Long interviewerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_recommendation")
    private RecommendationType overallRecommendation;

    @Column(name = "general_comment", columnDefinition = "TEXT")
    private String generalComment;

    @Column(name = "salary_proposed")
    private java.math.BigDecimal salaryProposed;

    @Column(name = "salary_note", columnDefinition = "TEXT")
    private String salaryNote;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "evaluation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InterviewEvaluationScore> scores = new ArrayList<>();

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}