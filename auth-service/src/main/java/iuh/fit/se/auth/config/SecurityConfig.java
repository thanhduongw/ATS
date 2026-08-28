package iuh.fit.se.auth.config;

import iuh.fit.se.auth.security.OAuth2LoginSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.google.client-secret:}")
    private String googleClientSecret;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                // OAuth2 login (Google SSO) cần session để lưu tạm authorization request + tenantCode
                // giữa bước redirect và callback; các endpoint REST khác không dùng session này.
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/register-company",
                                "/api/auth/verify-email",
                                "/api/auth/login",
                                "/api/auth/refresh-token",
                                "/api/auth/oauth2/exchange",
                                "/oauth2/**",
                                "/login/oauth2/**"
                        ).permitAll()
                        .anyRequest().permitAll() // MVP: Gateway đã chặn phía trước; service tự tin header X-User-Id/X-Tenant-Id
                );

        // Chỉ bật OAuth2 login khi đã cấu hình Google Client ID/Secret — nếu để trống (mặc định),
        // bỏ qua hoàn toàn thay vì để Spring tự động cấu hình (client-id rỗng sẽ làm service crash lúc start).
        if (!googleClientId.isBlank() && !googleClientSecret.isBlank()) {
            // Endpoint chuẩn, ổn định của Google (thay cho CommonOAuth2Provider.GOOGLE — không có sẵn
            // trong bản spring-security-oauth2-client đang dùng).
            ClientRegistration googleRegistration = ClientRegistration.withRegistrationId("google")
                    .clientId(googleClientId)
                    .clientSecret(googleClientSecret)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
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
                    .successHandler(oAuth2LoginSuccessHandler));
        }

        return http.build();
    }
}