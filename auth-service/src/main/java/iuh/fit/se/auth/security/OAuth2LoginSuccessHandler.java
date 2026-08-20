package iuh.fit.se.auth.security;

import iuh.fit.se.auth.dto.response.LoginResponse;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.service.LoginService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final LoginService loginService;
    private final OAuth2TokenExchangeStore tokenExchangeStore;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {

        Object tenantCodeAttr = request.getSession(true).getAttribute(OAuth2PreLoginController.TENANT_CODE_SESSION_KEY);
        request.getSession().removeAttribute(OAuth2PreLoginController.TENANT_CODE_SESSION_KEY);

        if (tenantCodeAttr == null) {
            redirectWithError(response, "Thiếu mã công ty — vui lòng đăng nhập lại từ trang chủ");
            return;
        }

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        Boolean emailVerified = oAuth2User.getAttribute("email_verified");

        if (email == null || Boolean.FALSE.equals(emailVerified)) {
            redirectWithError(response, "Email Google chưa được xác thực");
            return;
        }

        try {
            LoginResponse tokens = loginService.loginWithGoogle(String.valueOf(tenantCodeAttr), email);
            String code = tokenExchangeStore.store(tokens);
            String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/callback")
                    .queryParam("code", code)
                    .build().encode().toUriString();
            response.sendRedirect(redirectUrl);
        } catch (BusinessException e) {
            log.warn("Google SSO login thất bại: {}", e.getMessage());
            redirectWithError(response, e.getMessage());
        }
    }

    private void redirectWithError(HttpServletResponse response, String message) throws IOException {
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                .queryParam("ssoError", message)
                .build().encode().toUriString();
        response.sendRedirect(redirectUrl);
    }
}
