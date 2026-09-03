package iuh.fit.se.application.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long>, JpaSpecificationExecutor<Application> {

    List<Application> findByJobPostingIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long jobPostingId);

    List<Application> findByCandidateIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long candidateId);

    List<Application> findByDeletedAtIsNullOrderByCreatedAtDesc();

    Optional<Application> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByCandidateIdAndJobPostingIdAndDeletedAtIsNull(Long candidateId, Long jobPostingId);

    /** Hồ sơ chưa kết thúc quy trình (không HIRED/REJECTED) và không đổi giai đoạn quá lâu — dùng cho nhắc nhở tự động. */
    List<Application> findByDeletedAtIsNullAndCurrentStageTypeNotInAndUpdatedAtBefore(
            List<String> excludedStageTypes, LocalDateTime threshold);
}
