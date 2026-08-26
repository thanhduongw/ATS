package iuh.fit.se.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * Bước trung gian trước khi vào luồng OAuth2 của Spring Security: lưu tenantCode vào session
 * (Google chỉ trả về email, không biết công ty nào), rồi chuyển tiếp sang /oauth2/authorization/google.
 */
@RestController
public class OAuth2PreLoginController {

    public static final String TENANT_CODE_SESSION_KEY = "sso_tenant_code";

    @GetMapping("/oauth2/pre-login")
    public void preLogin(
            @RequestParam String tenantCode,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        request.getSession(true).setAttribute(TENANT_CODE_SESSION_KEY, tenantCode.trim().toUpperCase());
        response.sendRedirect("/oauth2/authorization/google");
    }
}
