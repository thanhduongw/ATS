package iuh.fit.se.masterdata.jobtitle;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface JobTitleRepository extends JpaRepository<JobTitle, Long> {
    List<JobTitle> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
