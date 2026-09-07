package iuh.fit.se.auth.config;

import iuh.fit.se.auth.security.OAuth2LoginSuccessHandler;
import iuh.fit.se.auth.security.TrustedHeaderAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final TrustedHeaderAuthenticationFilter trustedHeaderAuthenticationFilter;

    /**
     * Toan bo entrypoint OAuth2 nam duoi /api/auth/** de di chung route gateway va chung
     * location nginx voi REST — khong can publish port 8081 ra host, va khong dung do
     * route SPA /oauth2/callback.
     */
    static final String OAUTH2_PRE_LOGIN_PATH = "/api/auth/oauth2/pre-login";
    static final String OAUTH2_AUTHORIZATION_BASE_URI = "/api/auth/oauth2/authorization";
    static final String OAUTH2_CALLBACK_BASE_URI = "/api/auth/login/oauth2/code/*";
    private static final String DEFAULT_REDIRECT_URI_TEMPLATE =
            "{baseUrl}/api/auth/login/oauth2/code/{registrationId}";

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.google.client-secret:}")
    private String googleClientSecret;

    /**
     * De trong thi suy ra tu request (can server.forward-headers-strategy=framework khi
     * chay sau nginx + gateway). Set GOOGLE_REDIRECT_URI de co gia tri tuyet doi, khong
     * phu thuoc header proxy — day la gia tri phai khop voi Google Cloud Console.
     */
    @Value("${app.google.redirect-uri:}")
    private String googleRedirectUri;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, exception) -> response.sendError(401))
                        .accessDeniedHandler((request, response, exception) -> response.sendError(403)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/verify-email",
                                "/api/auth/resend-otp",
                                "/api/auth/login",
                                "/api/auth/refresh-token",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/auth/oauth2/exchange"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/auth/public/**",
                                OAUTH2_PRE_LOGIN_PATH,
                                OAUTH2_AUTHORIZATION_BASE_URI + "/*",
                                OAUTH2_CALLBACK_BASE_URI
                        ).permitAll()
                        .requestMatchers("/error", "/swagger-ui/**", "/v3/api-docs/**",
                                "/api/auth/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/auth/register-company").denyAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/admin/users").hasRole("COMPANY_ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(trustedHeaderAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        if (!googleClientId.isBlank() && !googleClientSecret.isBlank()) {
            ClientRegistration googleRegistration = ClientRegistration.withRegistrationId("google")
                    .clientId(googleClientId)
                    .clientSecret(googleClientSecret)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri(googleRedirectUri.isBlank() ? DEFAULT_REDIRECT_URI_TEMPLATE : googleRedirectUri)
                    .scope("email", "profile")
                    .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                    .tokenUri("https://www.googleapis.com/oauth2/v4/token")
                    .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                    .userNameAttributeName("sub")
                    .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                    .clientName("Google")
                    .build();
            http.oauth2Login(oauth2 -> oauth2
                    .clientRegistrationRepository(new InMemoryClientRegistrationRepository(googleRegistration))
                    .authorizationEndpoint(endpoint -> endpoint.baseUri(OAUTH2_AUTHORIZATION_BASE_URI))
                    .redirectionEndpoint(endpoint -> endpoint.baseUri(OAUTH2_CALLBACK_BASE_URI))
                    .successHandler(oAuth2LoginSuccessHandler));
        }

        return http.build();
    }
}
