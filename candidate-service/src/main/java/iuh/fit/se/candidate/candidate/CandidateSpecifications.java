package iuh.fit.se.candidate.candidate;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public final class CandidateSpecifications {

    private CandidateSpecifications() {}

    /**
     * matchedSkillIds should be pre-resolved by the caller (skill names live in masterdata-service,
     * so name matching can't happen inside this DB-only Specification).
     */
    public static Specification<Candidate> build(
            String keyword, Boolean hasCv, List<Long> matchedSkillIds, PoolStatus poolStatus) {

        return (root, query, cb) -> {
            query.distinct(true);

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (poolStatus != null) {
                predicates.add(cb.equal(root.get("poolStatus"), poolStatus));
            }
            if (hasCv != null) {
                predicates.add(hasCv
                        ? cb.isNotNull(root.get("cvFileUrl"))
                        : cb.isNull(root.get("cvFileUrl")));
            }

            if (keyword != null && !keyword.isBlank()) {
                // Không phân biệt hoa thường và dấu tiếng Việt (mục 4.5).
                String like = iuh.fit.se.candidate.common.TextSearch.likePattern(keyword);
                List<Predicate> keywordPredicates = new ArrayList<>();
                for (String field : List.of("fullName", "email", "currentPosition", "phone")) {
                    keywordPredicates.add(cb.like(
                            iuh.fit.se.candidate.common.TextSearch.fold(cb, root.get(field)), like, '!'));
                }

                if (matchedSkillIds != null && !matchedSkillIds.isEmpty()) {
                    Join<Candidate, CandidateSkill> skillJoin = root.join("skills", JoinType.LEFT);
                    keywordPredicates.add(skillJoin.get("skillId").in(matchedSkillIds));
                }

                predicates.add(cb.or(keywordPredicates.toArray(new Predicate[0])));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Candidate> accessibleIds(Set<Long> candidateIds) {
        return (root, query, cb) -> root.get("id").in(candidateIds);
    }
}
