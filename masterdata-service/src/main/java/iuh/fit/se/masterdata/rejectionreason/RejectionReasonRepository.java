package iuh.fit.se.masterdata.rejectionreason;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RejectionReasonRepository extends JpaRepository<RejectionReason, Long> {
    List<RejectionReason> findByTenantIdOrderByNameAsc(Long tenantId);
    Optional<RejectionReason> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}