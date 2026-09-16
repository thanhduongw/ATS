package iuh.fit.se.offer.offer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OfferRepository extends JpaRepository<Offer, Long>, JpaSpecificationExecutor<Offer> {
    List<Offer> findByApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long applicationId);
    Optional<Offer> findByIdAndDeletedAtIsNull(Long id);

    long countByJobPostingIdAndStatusInAndDeletedAtIsNull(
            Long jobPostingId, Collection<OfferStatus> statuses);
}
