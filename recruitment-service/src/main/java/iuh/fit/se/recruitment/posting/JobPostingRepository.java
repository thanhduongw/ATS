package iuh.fit.se.recruitment.posting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long>,
        JpaSpecificationExecutor<JobPosting> {
    Optional<JobPosting> findByIdAndDeletedAtIsNull(Long id);
    boolean existsByRequisition_IdAndDeletedAtIsNull(Long requisitionId);
    List<JobPosting> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(PostingStatus status);
}
