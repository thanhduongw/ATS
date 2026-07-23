package iuh.fit.se.masterdata.experiencelevel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExperienceLevelRepository extends JpaRepository<ExperienceLevel, Long> {
    List<ExperienceLevel> findByTenantIdOrderByMinYearsAsc(Long tenantId);
    Optional<ExperienceLevel> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}