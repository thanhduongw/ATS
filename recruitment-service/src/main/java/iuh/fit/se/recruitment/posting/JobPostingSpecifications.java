package iuh.fit.se.recruitment.posting;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class JobPostingSpecifications {

    private JobPostingSpecifications() {}

    /**
     * @param restrictToScope true for a non-admin actor whose visibility must be limited by
     *                        department or approver assignment. When such an actor carries no
     *                        usable scope (for example a legacy account without a department),
     *                        the query fails closed instead of returning every posting.
     */
    public static Specification<JobPosting> build(
            Long scopeDepartmentId,
            Long scopeApproverId,
            PostingStatus status,
            Long employmentTypeId,
            Long workLocationId,
            String keyword,
            boolean restrictToScope) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (scopeDepartmentId != null && scopeApproverId != null) {
                predicates.add(cb.or(
                        cb.equal(root.get("requisition").get("departmentId"), scopeDepartmentId),
                        cb.equal(root.get("requisition").get("approverId"), scopeApproverId)));
            } else if (scopeDepartmentId != null) {
                predicates.add(cb.equal(root.get("requisition").get("departmentId"), scopeDepartmentId));
            } else if (scopeApproverId != null) {
                predicates.add(cb.equal(root.get("requisition").get("approverId"), scopeApproverId));
            } else if (restrictToScope) {
                predicates.add(cb.disjunction());
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (employmentTypeId != null) {
                predicates.add(cb.equal(root.get("employmentTypeId"), employmentTypeId));
            }
            if (workLocationId != null) {
                predicates.add(cb.equal(root.get("workLocationId"), workLocationId));
            }
            if (keyword != null && !keyword.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("title")), "%" + keyword.trim().toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
