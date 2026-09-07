package iuh.fit.se.auth.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * Starts the optional Google OAuth2 flow for the single-company application.
 *
 * <p>Nam duoi /api/auth/** de browser goi duoc qua chinh entrypoint cong khai
 * (nginx -> api-gateway -> auth-service); Location tra ve la path tuong doi same-origin
 * nen khong bao gio lo port noi bo cua auth-service ra ngoai.
 */
@RestController
public class OAuth2PreLoginController {

    static final String PRE_LOGIN_PATH = "/api/auth/oauth2/pre-login";
    static final String AUTHORIZATION_PATH = "/api/auth/oauth2/authorization/google";

    @GetMapping(PRE_LOGIN_PATH)
    public void preLogin(HttpServletResponse response) throws IOException {
        response.sendRedirect(AUTHORIZATION_PATH);
    }
}
