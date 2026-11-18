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
                // "Đã rút đơn" (WITHDRAWN) là loại ảo: DB lưu REJECTED kèm closed_reason WITHDRAWN / DATA_DELETED.
                // Lọc REJECTED thì không lấy các đơn đã rút; lọc WITHDRAWN thì chỉ lấy các đơn đó.
                List<String> types = parseStageTypes(stageType);
                var withdrawnReason = root.get("closedReason").in("WITHDRAWN", "DATA_DELETED");
                var rejected = cb.equal(root.get("currentStageType"), "REJECTED");
                List<Predicate> any = new ArrayList<>();
                for (String type : types) {
                    if ("WITHDRAWN".equals(type)) {
                        any.add(cb.and(rejected, withdrawnReason));
                    } else if ("REJECTED".equals(type)) {
                        any.add(cb.and(rejected, cb.or(cb.isNull(root.get("closedReason")), cb.not(withdrawnReason))));
                    } else {
                        any.add(cb.equal(root.get("currentStageType"), type));
                    }
                }
                if (!any.isEmpty()) {
                    predicates.add(cb.or(any.toArray(new Predicate[0])));
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
     * R16: tìm theo tên hoặc email ứng viên (bản chụp lưu trên hồ sơ ứng tuyển), không phân biệt hoa thường và dấu.
     * Trả về null khi không có từ khoá để có thể ghép bằng {@code spec.and(...)}.
     */
    public static Specification<Application> keyword(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = iuh.fit.se.application.common.TextSearch.likePattern(keyword);
        return (root, query, cb) -> cb.or(
                cb.like(iuh.fit.se.application.common.TextSearch.fold(cb, root.get("candidateNameSnapshot")), like, '!'),
                cb.like(iuh.fit.se.application.common.TextSearch.fold(cb, root.get("candidateEmailSnapshot")), like, '!'));
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
