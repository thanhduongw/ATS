package iuh.fit.se.auth.repository;

import iuh.fit.se.auth.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByTenantId(Long tenantId);
}