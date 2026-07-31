package iuh.fit.se.candidate.candidate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    List<Candidate> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<Candidate> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndEmailIgnoreCase(Long tenantId, String email);
}