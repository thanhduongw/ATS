package iuh.fit.se.masterdata.worklocation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WorkLocationRepository extends JpaRepository<WorkLocation, Long> {
    List<WorkLocation> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
