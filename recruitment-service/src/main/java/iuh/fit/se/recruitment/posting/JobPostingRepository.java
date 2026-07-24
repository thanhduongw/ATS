package iuh.fit.se.recruitment.posting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {
    List<JobPosting> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<JobPosting> findByIdAndTenantId(Long id, Long tenantId);
}