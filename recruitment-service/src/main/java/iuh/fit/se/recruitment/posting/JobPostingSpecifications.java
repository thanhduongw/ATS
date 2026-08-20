package iuh.fit.se.recruitment.posting;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class JobPostingSpecifications {

    private JobPostingSpecifications() {}

    public static Specification<JobPosting> build(
            Long tenantId,
            PostingStatus status,
            Long employmentTypeId,
            Long workLocationId,
            String keyword) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            predicates.add(cb.isNull(root.get("deletedAt")));

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
