package iuh.fit.se.masterdata.common;

import org.springframework.security.access.AccessDeniedException;

import java.util.Set;

public class AccessGuard {

    private static final String COMPANY_ADMIN = "COMPANY_ADMIN";

    /** HR + Phòng ban — các role được phép tạo/sửa Yêu cầu tuyển dụng hoặc Tin tuyển dụng. */
    private static final Set<String> SKILL_CREATOR_ROLES = Set.of("COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER");

    public static void requireCompanyAdmin(String requesterRole) {
        if (!COMPANY_ADMIN.equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được thực hiện thao tác này");
        }
    }

    /** Cho phép quick-add skill mới ngay trong form Yêu cầu/Tin tuyển dụng, không chỉ Company Admin. */
    public static void requireSkillCreator(String requesterRole) {
        if (!SKILL_CREATOR_ROLES.contains(requesterRole)) {
            throw new AccessDeniedException("Bạn không có quyền tạo kỹ năng mới");
        }
    }
}