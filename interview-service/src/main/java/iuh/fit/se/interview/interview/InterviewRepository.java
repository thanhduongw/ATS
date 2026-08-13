package iuh.fit.se.interview.interview;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findByTenantIdOrderByScheduledAtDesc(Long tenantId);
    List<Interview> findByTenantIdAndApplicationIdOrderByScheduledAtDesc(Long tenantId, Long applicationId);
    List<Interview> findByTenantIdAndCandidateIdOrderByScheduledAtDesc(Long tenantId, Long candidateId);
    List<Interview> findByTenantIdAndInterviewers_InterviewerIdOrderByScheduledAtDesc(Long tenantId, Long interviewerId);
    Optional<Interview> findByIdAndTenantId(Long id, Long tenantId);
}