package iuh.fit.se.candidate.customfield;

import iuh.fit.se.candidate.candidate.Candidate;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "candidate_custom_field_value")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CandidateCustomFieldValue {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_definition_id", nullable = false)
    private CustomFieldDefinition fieldDefinition;

    @Column(columnDefinition = "TEXT")
    private String value;
}
