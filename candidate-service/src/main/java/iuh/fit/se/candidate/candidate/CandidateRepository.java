package iuh.fit.se.candidate.candidate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface CandidateRepository extends JpaRepository<Candidate, Long>, JpaSpecificationExecutor<Candidate> {
    List<Candidate> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);
    Optional<Candidate> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
    Optional<Candidate> findByTenantIdAndUserIdAndDeletedAtIsNull(Long tenantId, Long userId);
    Optional<Candidate> findByTenantIdAndEmailIgnoreCaseAndDeletedAtIsNull(Long tenantId, String email);
    boolean existsByTenantIdAndEmailIgnoreCaseAndDeletedAtIsNull(Long tenantId, String email);
}