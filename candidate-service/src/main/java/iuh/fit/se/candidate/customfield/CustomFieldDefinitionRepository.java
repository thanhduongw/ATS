package iuh.fit.se.candidate.customfield;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomFieldDefinitionRepository extends JpaRepository<CustomFieldDefinition, Long> {
    List<CustomFieldDefinition> findAllByOrderByFieldLabelAsc();
    List<CustomFieldDefinition> findByActiveTrue();
    boolean existsByFieldKeyIgnoreCase(String fieldKey);
}
