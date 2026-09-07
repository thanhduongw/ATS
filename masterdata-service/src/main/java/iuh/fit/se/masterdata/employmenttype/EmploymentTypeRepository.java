package iuh.fit.se.masterdata.employmenttype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EmploymentTypeRepository extends JpaRepository<EmploymentType, Long> {
    List<EmploymentType> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
