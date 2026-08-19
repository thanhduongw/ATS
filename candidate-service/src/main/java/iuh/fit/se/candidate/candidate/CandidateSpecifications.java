package iuh.fit.se.candidate.candidate;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class CandidateSpecifications {

    private CandidateSpecifications() {}

    /**
     * matchedSkillIds should be pre-resolved by the caller (skill names live in masterdata-service,
     * so name matching can't happen inside this DB-only Specification).
     */
    public static Specification<Candidate> build(
            Long tenantId, String keyword, Boolean hasCv, List<Long> matchedSkillIds) {

        return (root, query, cb) -> {
            query.distinct(true);

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (hasCv != null) {
                predicates.add(hasCv
                        ? cb.isNotNull(root.get("cvFileUrl"))
                        : cb.isNull(root.get("cvFileUrl")));
            }

            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                List<Predicate> keywordPredicates = new ArrayList<>();
                keywordPredicates.add(cb.like(cb.lower(root.get("fullName")), like));
                keywordPredicates.add(cb.like(cb.lower(root.get("email")), like));
                keywordPredicates.add(cb.like(cb.lower(root.get("currentPosition")), like));

                if (matchedSkillIds != null && !matchedSkillIds.isEmpty()) {
                    Join<Candidate, CandidateSkill> skillJoin = root.join("skills", JoinType.LEFT);
                    keywordPredicates.add(skillJoin.get("skillId").in(matchedSkillIds));
                }

                predicates.add(cb.or(keywordPredicates.toArray(new Predicate[0])));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
