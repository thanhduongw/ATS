package iuh.fit.se.offer.offer;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class OfferSpecifications {

    private OfferSpecifications() {}

    public static Specification<Offer> build(
            Long tenantId,
            Long candidateId,
            Long approverId,
            Long applicationId,
            OfferStatus status,
            LocalDateTime createdFrom,
            LocalDateTime createdTo) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (candidateId != null) {
                predicates.add(cb.equal(root.get("candidateId"), candidateId));
            }
            if (approverId != null) {
                predicates.add(cb.equal(root.get("approverId"), approverId));
            }
            if (applicationId != null) {
                predicates.add(cb.equal(root.get("applicationId"), applicationId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (createdFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), createdFrom));
            }
            if (createdTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), createdTo));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
