package iuh.fit.se.offer.offer;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class OfferSpecifications {

    private OfferSpecifications() {}

    public static Specification<Offer> build(
            Long candidateId,
            Long approverId,
            Long applicationId,
            OfferStatus status,
            LocalDateTime createdFrom,
            LocalDateTime createdTo,
            Long scopeDepartmentId,
            Long scopeAssignedRecruiterId,
            Long scopeApproverId,
            boolean candidateVisibleOnly) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            List<Predicate> scopePredicates = new ArrayList<>();
            if (scopeDepartmentId != null) {
                scopePredicates.add(cb.equal(root.get("departmentId"), scopeDepartmentId));
            }
            if (scopeAssignedRecruiterId != null) {
                scopePredicates.add(cb.equal(root.get("assignedRecruiterId"), scopeAssignedRecruiterId));
            }
            if (scopeApproverId != null) {
                scopePredicates.add(cb.equal(root.get("approverId"), scopeApproverId));
            }
            if (!scopePredicates.isEmpty()) {
                predicates.add(cb.or(scopePredicates.toArray(new Predicate[0])));
            }

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
            if (candidateVisibleOnly) {
                predicates.add(root.get("status").in(
                        OfferStatus.APPROVED, OfferStatus.ACCEPTED, OfferStatus.DECLINED));
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
