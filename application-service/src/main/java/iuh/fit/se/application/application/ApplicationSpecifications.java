package iuh.fit.se.application.application;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class ApplicationSpecifications {

    private ApplicationSpecifications() {}

    /**
     * @param restrictToScope true for a non-admin internal actor whose visibility must be limited by
     *                        department or assignment. When such an actor carries no usable scope
     *                        (for example a legacy account without a department), the query fails
     *                        closed instead of returning the whole company dataset.
     */
    public static Specification<Application> build(
            Long jobPostingId,
            Long candidateId,
            Long assignedRecruiterId,
            Long recruitmentSourceId,
            String stageType,
            LocalDateTime appliedFrom,
            LocalDateTime appliedTo,
            Long scopeDepartmentId,
            Long scopeAssignedRecruiterId,
            boolean restrictToScope) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (scopeDepartmentId != null && scopeAssignedRecruiterId != null) {
                predicates.add(cb.or(
                        cb.equal(root.get("departmentId"), scopeDepartmentId),
                        cb.equal(root.get("assignedRecruiterId"), scopeAssignedRecruiterId)));
            } else if (scopeDepartmentId != null) {
                predicates.add(cb.equal(root.get("departmentId"), scopeDepartmentId));
            } else if (scopeAssignedRecruiterId != null) {
                predicates.add(cb.equal(root.get("assignedRecruiterId"), scopeAssignedRecruiterId));
            } else if (restrictToScope) {
                predicates.add(cb.disjunction());
            }

            if (jobPostingId != null) {
                predicates.add(cb.equal(root.get("jobPostingId"), jobPostingId));
            }
            if (candidateId != null) {
                predicates.add(cb.equal(root.get("candidateId"), candidateId));
            }
            if (assignedRecruiterId != null) {
                predicates.add(cb.equal(root.get("assignedRecruiterId"), assignedRecruiterId));
            }
            if (recruitmentSourceId != null) {
                predicates.add(cb.equal(root.get("recruitmentSourceId"), recruitmentSourceId));
            }
            if (stageType != null && !stageType.isBlank()) {
                predicates.add(cb.equal(root.get("currentStageType"), stageType));
            }
            if (appliedFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("appliedAt"), appliedFrom));
            }
            if (appliedTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("appliedAt"), appliedTo));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
