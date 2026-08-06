package iuh.fit.se.candidate.candidate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    List<Candidate> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);
    Optional<Candidate> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
    boolean existsByTenantIdAndEmailIgnoreCaseAndDeletedAtIsNull(Long tenantId, String email);
}