package iuh.fit.se.application.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    /*
     * Cập nhật điểm AI. Mỗi câu chỉ áp dụng khi sự kiện không cũ hơn sự kiện đã áp dụng (ai_updated_at)
     * và trả về số dòng đã đổi. Tách 3 câu để không phải bind tham số NULL trong native query.
     */

    /** PENDING / PROCESSING: chỉ đổi trạng thái, giữ điểm cũ (nếu có) trong lúc chấm lại. */
    @Modifying
    @Transactional
    @Query(value = """
            UPDATE application SET ai_status = :status, ai_updated_at = :eventAt
            WHERE id = :id AND (ai_updated_at IS NULL OR ai_updated_at <= :eventAt)
            """, nativeQuery = true)
    int updateAiStatus(@Param("id") Long id, @Param("status") String status,
                       @Param("eventAt") LocalDateTime eventAt);

    @Modifying
    @Transactional
    @Query(value = """
            UPDATE application SET ai_status = 'COMPLETED', ai_score = :score, ai_tier = :tier,
                   ai_updated_at = :eventAt
            WHERE id = :id AND (ai_updated_at IS NULL OR ai_updated_at <= :eventAt)
            """, nativeQuery = true)
    int updateAiCompleted(@Param("id") Long id, @Param("score") BigDecimal score, @Param("tier") String tier,
                          @Param("eventAt") LocalDateTime eventAt);

    /** FAILED: ai-service đã xoá điểm cũ, bản sao cũng xoá theo. */
    @Modifying
    @Transactional
    @Query(value = """
            UPDATE application SET ai_status = 'FAILED', ai_score = NULL, ai_tier = NULL, ai_updated_at = :eventAt
            WHERE id = :id AND (ai_updated_at IS NULL OR ai_updated_at <= :eventAt)
            """, nativeQuery = true)
    int updateAiFailed(@Param("id") Long id, @Param("eventAt") LocalDateTime eventAt);
}
