package iuh.fit.se.masterdata.recruitmentsource;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RecruitmentSourceRepository extends JpaRepository<RecruitmentSource, Long> {
    List<RecruitmentSource> findByTenantIdOrderByNameAsc(Long tenantId);
    Optional<RecruitmentSource> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}