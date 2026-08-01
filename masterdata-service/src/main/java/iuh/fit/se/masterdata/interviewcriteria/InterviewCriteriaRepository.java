package iuh.fit.se.masterdata.interviewcriteria;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewCriteriaRepository extends JpaRepository<InterviewCriteria, Long> {
    List<InterviewCriteria> findByTenantIdOrderByNameAsc(Long tenantId);
    Optional<InterviewCriteria> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(Long tenantId, String name);
}