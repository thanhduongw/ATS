package iuh.fit.se.candidate.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Application> findByTenantIdAndJobPostingIdOrderByCreatedAtDesc(Long tenantId, Long jobPostingId);
    List<Application> findByTenantIdAndCandidateIdOrderByCreatedAtDesc(Long tenantId, Long candidateId);
    Optional<Application> findByIdAndTenantId(Long id, Long tenantId);
}