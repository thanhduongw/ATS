package iuh.fit.se.candidate.offer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId);
    List<Offer> findByTenantIdAndApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long applicationId);
    Optional<Offer> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}