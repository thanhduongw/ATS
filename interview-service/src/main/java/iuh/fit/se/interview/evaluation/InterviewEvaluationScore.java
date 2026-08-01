package iuh.fit.se.interview.evaluation;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "interview_evaluation_score")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewEvaluationScore {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private InterviewEvaluation evaluation;

    @Column(name = "criteria_id", nullable = false)
    private Long criteriaId;

    @Column(nullable = false)
    private Integer score;

    private String comment;
}