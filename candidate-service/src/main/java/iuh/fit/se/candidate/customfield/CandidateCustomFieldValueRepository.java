package iuh.fit.se.candidate.customfield;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidateCustomFieldValueRepository extends JpaRepository<CandidateCustomFieldValue, Long> {
    List<CandidateCustomFieldValue> findByCandidateId(Long candidateId);
    Optional<CandidateCustomFieldValue> findByCandidateIdAndFieldDefinitionId(Long candidateId, Long fieldDefinitionId);
}
