package iuh.fit.se.candidate.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);
    List<Application> findByTenantIdAndJobPostingIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long jobPostingId);
    List<Application> findByTenantIdAndCandidateIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long candidateId);
    Optional<Application> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}