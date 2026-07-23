package iuh.fit.se.masterdata.emailtemplate;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
    List<EmailTemplate> findByTenantIdOrderByCodeAsc(Long tenantId);
    Optional<EmailTemplate> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndCodeIgnoreCase(Long tenantId, String code);
}