package iuh.fit.se.masterdata.contracttype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ContractTypeRepository extends JpaRepository<ContractType, Long> {
    List<ContractType> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
