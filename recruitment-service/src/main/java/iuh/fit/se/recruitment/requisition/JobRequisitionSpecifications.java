package iuh.fit.se.recruitment.requisition;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class JobRequisitionSpecifications {

    private JobRequisitionSpecifications() {}

    /**
     * @param restrictToScope true for a non-admin actor whose visibility must be limited by
     *                        department or approver assignment. When such an actor carries no
     *                        usable scope (for example a legacy account without a department),
     *                        the query fails closed instead of returning every requisition.
     */
    public static Specification<JobRequisition> build(
            Long requesterId,
            Long approverId,
            Long scopeDepartmentId,
            Long scopeApproverId,
            RequisitionStatus status,
            Long departmentId,
            String keyword,
            boolean restrictToScope) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (requesterId != null) {
                predicates.add(cb.equal(root.get("requesterId"), requesterId));
            }
            if (approverId != null) {
                predicates.add(cb.equal(root.get("approverId"), approverId));
            }
            if (scopeDepartmentId != null && scopeApproverId != null) {
                predicates.add(cb.or(
                        cb.equal(root.get("departmentId"), scopeDepartmentId),
                        cb.equal(root.get("approverId"), scopeApproverId)));
            } else if (scopeDepartmentId != null) {
                predicates.add(cb.equal(root.get("departmentId"), scopeDepartmentId));
            } else if (scopeApproverId != null) {
                predicates.add(cb.equal(root.get("approverId"), scopeApproverId));
            } else if (restrictToScope) {
                predicates.add(cb.disjunction());
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
