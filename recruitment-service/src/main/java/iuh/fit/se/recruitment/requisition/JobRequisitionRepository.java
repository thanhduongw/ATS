package iuh.fit.se.recruitment.requisition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobRequisitionRepository extends JpaRepository<JobRequisition, Long> {
    List<JobRequisition> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<JobRequisition> findByIdAndTenantId(Long id, Long tenantId);
}