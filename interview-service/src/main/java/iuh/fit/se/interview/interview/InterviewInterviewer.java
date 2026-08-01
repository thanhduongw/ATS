package iuh.fit.se.interview.interview;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "interview_interviewer")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewInterviewer {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", nullable = false)
    private Interview interview;

    @Column(name = "interviewer_id", nullable = false)
    private Long interviewerId;

    @Column(name = "interviewer_name_snapshot", nullable = false)
    private String interviewerNameSnapshot;
}