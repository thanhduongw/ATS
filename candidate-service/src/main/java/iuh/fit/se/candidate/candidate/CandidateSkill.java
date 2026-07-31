package iuh.fit.se.candidate.candidate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "candidate_skill")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CandidateSkill {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "skill_id", nullable = false)
    private Long skillId;
}