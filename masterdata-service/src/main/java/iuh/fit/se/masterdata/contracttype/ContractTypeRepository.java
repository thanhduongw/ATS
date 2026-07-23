package iuh.fit.se.masterdata.contracttype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ContractTypeRepository extends JpaRepository<ContractType, Long> {
    List<ContractType> findByTenantIdOrderByNameAsc(Long tenantId);
    Optional<ContractType> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}