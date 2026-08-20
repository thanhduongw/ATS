package iuh.fit.se.recruitment.requisition;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class JobRequisitionSpecifications {

    private JobRequisitionSpecifications() {}

    public static Specification<JobRequisition> build(
            Long tenantId,
            Long requesterId,
            Long approverId,
            RequisitionStatus status,
            Long departmentId,
            String keyword) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (requesterId != null) {
                predicates.add(cb.equal(root.get("requesterId"), requesterId));
            }
            if (approverId != null) {
                predicates.add(cb.equal(root.get("approverId"), approverId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("departmentId"), departmentId));
            }
            if (keyword != null && !keyword.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("title")), "%" + keyword.trim().toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
