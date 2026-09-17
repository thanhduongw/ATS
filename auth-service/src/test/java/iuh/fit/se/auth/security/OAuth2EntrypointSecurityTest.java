package iuh.fit.se.auth.security;

import iuh.fit.se.auth.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Google SSO phai khoi dong duoc qua entrypoint cong khai (/api/auth/**) ma khong can
 * publish port 8081 ra host, va khong duoc noi rong be mat public ngoai dung 3 path do.
 */
@WebMvcTest(OAuth2PreLoginController.class)
@Import({SecurityConfig.class, TrustedHeaderAuthenticationFilter.class})
class OAuth2EntrypointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Test
    void preLoginIsPublicAndRedirectsToASameOriginPublicPath() throws Exception {
        mockMvc.perform(get(OAuth2PreLoginController.PRE_LOGIN_PATH))
                .andExpect(status().is3xxRedirection())
                // Location tuong doi => browser giu nguyen origin cong khai,
                // khong bao gio lo http://auth-service:8081 ra ngoai.
                .andExpect(header().string("Location", OAuth2PreLoginController.AUTHORIZATION_PATH));
    }

    /**
     * Trong slice nay oauth2Login bi tat (client-id trong) nen 2 path duoi khong co handler.
     * Dieu can chung minh la chung DI QUA duoc security filter chain: request cham toi tang
     * dispatch va bat NoResourceFoundException, thay vi bi chan bang 401/403.
     * Khi chay that (co GOOGLE_CLIENT_ID) chung se duoc Spring Security xu ly truoc dispatch.
     */
    @Test
    void theAuthorizationAndCallbackEndpointsPassTheSecurityChain() throws Exception {
        for (String path : new String[]{
                OAuth2PreLoginController.AUTHORIZATION_PATH,
                "/api/auth/login/oauth2/code/google"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(result -> assertThat(result.getResponse().getStatus())
                            .as("%s must not be blocked by the security filter chain", path)
                            .isNotIn(HttpStatus.UNAUTHORIZED.value(), HttpStatus.FORBIDDEN.value()))
                    .andExpect(result -> assertThat(result.getResolvedException())
                            .as("%s must reach request dispatch", path)
                            .isInstanceOf(NoResourceFoundException.class));
        }
    }

    @Test
    void everyOauth2EntrypointStaysUnderTheGatewayAuthRoute() {
        assertThat(OAuth2PreLoginController.PRE_LOGIN_PATH).startsWith("/api/auth/");
        assertThat(OAuth2PreLoginController.AUTHORIZATION_PATH).startsWith("/api/auth/");
    }

    @Test
    void legacyRootLevelOauth2PathIsNoLongerPublic() throws Exception {
        mockMvc.perform(get("/oauth2/pre-login"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/login/oauth2/code/google"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void onlyGetIsPublicOnThePreLoginEntrypoint() throws Exception {
        mockMvc.perform(post(OAuth2PreLoginController.PRE_LOGIN_PATH))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void otherAuthEndpointsAreNotOpenedUpByTheOauth2Matchers() throws Exception {
        mockMvc.perform(get("/api/auth/oauth2/anything-else"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/users"))
                .andExpect(status().isUnauthorized());
    }
}
