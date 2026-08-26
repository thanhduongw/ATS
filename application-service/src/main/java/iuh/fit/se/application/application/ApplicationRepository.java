package iuh.fit.se.application.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long>, JpaSpecificationExecutor<Application> {

    List<Application> findByTenantIdAndJobPostingIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long jobPostingId);

    List<Application> findByTenantIdAndCandidateIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long candidateId);

    List<Application> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);

    Optional<Application> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);

    boolean existsByTenantIdAndCandidateIdAndJobPostingIdAndDeletedAtIsNull(Long tenantId, Long candidateId, Long jobPostingId);

    /** Hồ sơ chưa kết thúc quy trình (không HIRED/REJECTED) và không đổi giai đoạn quá lâu — dùng cho nhắc nhở tự động. */
    List<Application> findByDeletedAtIsNullAndCurrentStageTypeNotInAndUpdatedAtBefore(
            List<String> excludedStageTypes, LocalDateTime threshold);
}
