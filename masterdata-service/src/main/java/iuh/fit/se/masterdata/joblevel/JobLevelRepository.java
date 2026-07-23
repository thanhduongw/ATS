package iuh.fit.se.masterdata.joblevel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface JobLevelRepository extends JpaRepository<JobLevel, Long> {
    List<JobLevel> findByTenantIdOrderByOrderNoAsc(Long tenantId);
    Optional<JobLevel> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}