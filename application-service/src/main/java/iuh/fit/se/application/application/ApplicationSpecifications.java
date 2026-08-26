package iuh.fit.se.application.application;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class ApplicationSpecifications {

    private ApplicationSpecifications() {}

    public static Specification<Application> build(
            Long tenantId,
            Long jobPostingId,
            Long candidateId,
            Long assignedRecruiterId,
            Long recruitmentSourceId,
            String stageType,
            LocalDateTime appliedFrom,
            LocalDateTime appliedTo) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            predicates.add(cb.isNull(root.get("deletedAt")));

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
