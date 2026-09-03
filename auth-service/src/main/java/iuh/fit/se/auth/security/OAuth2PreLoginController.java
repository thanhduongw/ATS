package iuh.fit.se.auth.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * Starts the optional Google OAuth2 flow for the single-company application.
 */
@RestController
public class OAuth2PreLoginController {

    @GetMapping("/oauth2/pre-login")
    public void preLogin(HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/google");
    }
}
