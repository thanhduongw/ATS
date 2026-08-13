package iuh.fit.se.recruitment.requisition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobRequisitionRepository extends JpaRepository<JobRequisition, Long> {
    List<JobRequisition> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);
    List<JobRequisition> findByTenantIdAndRequesterIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long requesterId);
    Optional<JobRequisition> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}