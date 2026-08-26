package iuh.fit.se.masterdata.common;

import org.springframework.security.access.AccessDeniedException;

import java.util.Set;

public class AccessGuard {

    private static final String COMPANY_ADMIN = "COMPANY_ADMIN";

    /** HR + Phòng ban — các role được phép tạo/sửa Yêu cầu tuyển dụng hoặc Tin tuyển dụng. */
    private static final Set<String> QUICK_ADD_ROLES = Set.of("COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER");

    public static void requireCompanyAdmin(String requesterRole) {
        if (!COMPANY_ADMIN.equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được thực hiện thao tác này");
        }
    }

    /** Cho phép quick-add danh mục mới (kỹ năng, chức vụ...) ngay trong form Yêu cầu/Tin tuyển dụng, không chỉ Company Admin. */
    public static void requireQuickAddRole(String requesterRole) {
        if (!QUICK_ADD_ROLES.contains(requesterRole)) {
            throw new AccessDeniedException("Bạn không có quyền tạo danh mục mới");
        }
    }
}