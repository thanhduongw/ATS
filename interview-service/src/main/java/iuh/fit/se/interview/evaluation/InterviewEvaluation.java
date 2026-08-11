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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", nullable = false)
    private Interview interview;

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