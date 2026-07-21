package iuh.fit.se.masterdata.common;

import org.springframework.security.access.AccessDeniedException;

public class AccessGuard {

    private static final String COMPANY_ADMIN = "COMPANY_ADMIN";

    public static void requireCompanyAdmin(String requesterRole) {
        if (!COMPANY_ADMIN.equals(requesterRole)) {
            throw new AccessDeniedException("Chỉ Company Admin được thực hiện thao tác này");
        }
    }
}