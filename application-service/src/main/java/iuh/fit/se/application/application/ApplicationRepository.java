package iuh.fit.se.application.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long>, JpaSpecificationExecutor<Application> {

    List<Application> findByTenantIdAndJobPostingIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long jobPostingId);

    List<Application> findByTenantIdAndCandidateIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long candidateId);

    List<Application> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);

    Optional<Application> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);

    boolean existsByTenantIdAndCandidateIdAndJobPostingIdAndDeletedAtIsNull(Long tenantId, Long candidateId, Long jobPostingId);
}
