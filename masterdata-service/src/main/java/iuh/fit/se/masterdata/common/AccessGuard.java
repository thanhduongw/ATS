package iuh.fit.se.masterdata.common;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;

public class AccessGuard {

    public static void requireCompanyAdmin(String ignoredRequesterRole) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
    }

    /** Cho phép quick-add danh mục mới (kỹ năng, chức vụ...) ngay trong form Yêu cầu/Tin tuyển dụng, không chỉ Company Admin. */
    public static void requireQuickAddRole(String ignoredRequesterRole) {
        AuthorizationPolicy.requireInternal(CurrentUser.required());
    }
}
