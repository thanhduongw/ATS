package iuh.fit.se.auth.repository;

import iuh.fit.se.auth.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    java.util.Optional<Company> findFirstByOrderByIdAsc();
}
