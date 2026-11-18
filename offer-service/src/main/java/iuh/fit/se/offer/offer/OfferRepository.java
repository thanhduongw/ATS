package iuh.fit.se.offer.offer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OfferRepository extends JpaRepository<Offer, Long>, JpaSpecificationExecutor<Offer> {
    List<Offer> findByApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long applicationId);
    Optional<Offer> findByIdAndDeletedAtIsNull(Long id);

    /** Thư đã gửi quá hạn phản hồi — dùng cho job quét hạn. */
    List<Offer> findByStatusAndResponseDeadlineBeforeAndDeletedAtIsNull(
            OfferStatus status, java.time.LocalDateTime deadline);

    /** Ẩn danh hoá tên và liên hệ của ứng viên trong mọi thư mời của một ứng viên đã xoá dữ liệu. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query(value = """
            UPDATE offer SET candidate_name_snapshot = :name, candidate_email_snapshot = NULL, candidate_phone_snapshot = NULL
            WHERE candidate_id = :candidateId
            """, nativeQuery = true)
    int anonymizeCandidate(@org.springframework.data.repository.query.Param("candidateId") Long candidateId,
                           @org.springframework.data.repository.query.Param("name") String name);

    long countByJobPostingIdAndStatusInAndDeletedAtIsNull(
            Long jobPostingId, Collection<OfferStatus> statuses);
}
