package iuh.fit.se.masterdata.department;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findByTenantIdOrderByNameAsc(Long tenantId);
    Optional<Department> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}