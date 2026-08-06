package iuh.fit.se.candidate.offer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Offer> findByTenantIdAndApplicationIdOrderByCreatedAtDesc(Long tenantId, Long applicationId);
    Optional<Offer> findByIdAndTenantId(Long id, Long tenantId);
}