package iuh.fit.se.candidate.customfield;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomFieldDefinitionRepository extends JpaRepository<CustomFieldDefinition, Long> {
    List<CustomFieldDefinition> findByTenantIdOrderByFieldLabelAsc(Long tenantId);
    List<CustomFieldDefinition> findByTenantIdAndActiveTrue(Long tenantId);
    Optional<CustomFieldDefinition> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndFieldKeyIgnoreCase(Long tenantId, String fieldKey);
}
