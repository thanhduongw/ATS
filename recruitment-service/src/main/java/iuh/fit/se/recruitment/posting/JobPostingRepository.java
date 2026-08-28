package iuh.fit.se.recruitment.posting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long>,
        JpaSpecificationExecutor<JobPosting> {
    Optional<JobPosting> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
    boolean existsByTenantIdAndRequisition_IdAndDeletedAtIsNull(Long tenantId, Long requisitionId);
    List<JobPosting> findByTenantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, PostingStatus status);
}