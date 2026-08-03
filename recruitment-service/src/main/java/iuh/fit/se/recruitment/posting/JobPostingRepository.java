package iuh.fit.se.recruitment.posting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {
    List<JobPosting> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);
    Optional<JobPosting> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}