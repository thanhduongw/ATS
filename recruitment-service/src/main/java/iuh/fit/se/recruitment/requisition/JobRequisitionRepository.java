package iuh.fit.se.recruitment.requisition;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface JobRequisitionRepository extends JpaRepository<JobRequisition, Long>,
        JpaSpecificationExecutor<JobRequisition> {
    Optional<JobRequisition> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}