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
            String aiTier,
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
                // Nhận một loại hoặc danh sách ngăn cách bằng dấu phẩy, để giao diện lọc theo
                // 6 giai đoạn cố định (vd. "Sàng lọc" = CV_SCREENING,HR_SCREENING).
                List<String> types = parseStageTypes(stageType);
                if (types.size() == 1) {
                    predicates.add(cb.equal(root.get("currentStageType"), types.get(0)));
                } else if (!types.isEmpty()) {
                    predicates.add(root.get("currentStageType").in(types));
                }
            }
            if (aiTier != null && !aiTier.isBlank()) {
                predicates.add(cb.equal(root.get("aiTier"), aiTier));
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

    /**
     * R16: tìm theo tên hoặc email ứng viên (bản chụp lưu trên hồ sơ ứng tuyển), không phân biệt hoa thường.
     * Trả về null khi không có từ khoá để có thể ghép bằng {@code spec.and(...)}.
     */
    public static Specification<Application> keyword(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.trim().toLowerCase().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("candidateNameSnapshot")), like, '!'),
                cb.like(cb.lower(root.get("candidateEmailSnapshot")), like, '!'));
    }

    /** Tách tham số stageType ("A" hoặc "A,B,C") thành danh sách, bỏ khoảng trắng và phần tử rỗng. */
    static List<String> parseStageTypes(String stageType) {
        List<String> types = new ArrayList<>();
        for (String part : stageType.split(",")) {
            String s = part.trim();
            if (!s.isEmpty() && !types.contains(s)) types.add(s);
        }
        return types;
    }
}
