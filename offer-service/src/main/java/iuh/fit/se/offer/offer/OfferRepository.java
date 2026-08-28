package iuh.fit.se.offer.offer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface OfferRepository extends JpaRepository<Offer, Long>, JpaSpecificationExecutor<Offer> {
    List<Offer> findByTenantIdAndApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long tenantId, Long applicationId);
    Optional<Offer> findByIdAndTenantIdAndDeletedAtIsNull(Long id, Long tenantId);
}