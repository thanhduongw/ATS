package iuh.fit.se.offer.offer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByTenantIdAndApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long applicationId);
    List<Offer> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);
    List<Offer> findByTenantIdAndCandidateIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long candidateId);
    List<Offer> findByTenantIdAndApproverIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long approverId);
    Optional<Offer> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}