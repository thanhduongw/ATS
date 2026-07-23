package iuh.fit.se.masterdata.educationlevel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EducationLevelRepository extends JpaRepository<EducationLevel, Long> {
    List<EducationLevel> findByTenantIdOrderByOrderNoAsc(Long tenantId);
    Optional<EducationLevel> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}