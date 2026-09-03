package iuh.fit.se.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAuthGlobalFilterTest {

    private static final String SECRET =
            "phase-two-test-secret-that-is-long-enough-for-hmac-sha-256-signatures";

    private JwtAuthGlobalFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthGlobalFilter();
        ReflectionTestUtils.setField(filter, "secret", SECRET);
    }

    @Test
    void rejectsProtectedRequestWithoutToken() {
        MockServerWebExchange exchange = exchangeFor("/api/candidate/candidates");

        filter.filter(exchange, ignored -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsAnonymousCandidateResumeUpload() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/candidate/me/resume").build());

        filter.filter(exchange, ignored -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsInvalidToken() {
        MockServerWebExchange exchange = exchangeFor("/api/candidate/candidates", "not-a-jwt");

        filter.filter(exchange, ignored -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsExpiredToken() {
        String token = token(Instant.now().minusSeconds(120), Instant.now().minusSeconds(60));
        MockServerWebExchange exchange = exchangeFor("/api/candidate/candidates", token);

        filter.filter(exchange, ignored -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void forwardsValidatedUserContextAndReplacesSpoofedIdentityHeaders() {
        String token = token(Instant.now(), Instant.now().plusSeconds(300));
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/candidate/candidates")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header(JwtAuthGlobalFilter.USER_ID_HEADER, "999")
                .header(JwtAuthGlobalFilter.USER_EMAIL_HEADER, "attacker@example.com")
                .header(JwtAuthGlobalFilter.USER_ROLE_HEADER, "COMPANY_ADMIN")
                .header(JwtAuthGlobalFilter.DEPARTMENT_ID_HEADER, "999")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();

        filter.filter(exchange, authenticatedExchange -> {
            forwarded.set(authenticatedExchange);
            return Mono.empty();
        }).block();

        HttpHeaders headers = forwarded.get().getRequest().getHeaders();
        assertThat(headers.getFirst(JwtAuthGlobalFilter.USER_ID_HEADER)).isEqualTo("42");
        assertThat(headers.getFirst(JwtAuthGlobalFilter.USER_EMAIL_HEADER)).isEqualTo("recruiter@example.com");
        assertThat(headers.getFirst(JwtAuthGlobalFilter.USER_ROLE_HEADER)).isEqualTo("RECRUITER");
        assertThat(headers.getFirst(JwtAuthGlobalFilter.DEPARTMENT_ID_HEADER)).isEqualTo("7");
    }

    @Test
    void onlyGetPublicJobPostingBypassesAuthentication() {
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        MockServerWebExchange publicGet = exchangeFor("/api/recruitment/public/companies/demo/jobs");

        filter.filter(publicGet, exchange -> {
            forwarded.set(exchange);
            return Mono.empty();
        }).block();

        assertThat(forwarded.get()).isNotNull();

        MockServerHttpRequest postRequest = MockServerHttpRequest
                .post("/api/recruitment/public/companies/demo/jobs")
                .build();
        MockServerWebExchange publicPost = MockServerWebExchange.from(postRequest);
        filter.filter(publicPost, ignored -> Mono.empty()).block();
        assertThat(publicPost.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void onlyPostCandidateRegistrationBypassesAuthentication() {
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        MockServerWebExchange publicPost = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/auth/register").build());

        filter.filter(publicPost, exchange -> {
            forwarded.set(exchange);
            return Mono.empty();
        }).block();

        assertThat(forwarded.get()).isNotNull();

        MockServerWebExchange registerGet = exchangeFor("/api/auth/register");
        filter.filter(registerGet, ignored -> Mono.empty()).block();
        assertThat(registerGet.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutBypassesAccessTokenAuthenticationAndStripsSpoofedIdentity() {
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        MockServerWebExchange logout = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/auth/logout")
                        .header(JwtAuthGlobalFilter.USER_ID_HEADER, "999")
                        .header(JwtAuthGlobalFilter.USER_ROLE_HEADER, "COMPANY_ADMIN")
                        .build());

        filter.filter(logout, exchange -> {
            forwarded.set(exchange);
            return Mono.empty();
        }).block();

        assertThat(forwarded.get()).isNotNull();
        assertThat(forwarded.get().getRequest().getHeaders()
                .containsKey(JwtAuthGlobalFilter.USER_ID_HEADER)).isFalse();
        assertThat(forwarded.get().getRequest().getHeaders()
                .containsKey(JwtAuthGlobalFilter.USER_ROLE_HEADER)).isFalse();
    }

    @Test
    void onlyGetSingleCompanyProfileBypassesAuthentication() {
        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        MockServerWebExchange publicGet = exchangeFor("/api/auth/public/company");

        filter.filter(publicGet, exchange -> {
            forwarded.set(exchange);
            return Mono.empty();
        }).block();

        assertThat(forwarded.get()).isNotNull();

        MockServerWebExchange legacyTenantPath = exchangeFor("/api/auth/public/companies/demo");
        filter.filter(legacyTenantPath, ignored -> Mono.empty()).block();
        assertThat(legacyTenantPath.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private MockServerWebExchange exchangeFor(String path) {
        return MockServerWebExchange.from(MockServerHttpRequest.get(path).build());
    }

    private MockServerWebExchange exchangeFor(String path, String token) {
        return MockServerWebExchange.from(MockServerHttpRequest.get(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build());
    }

    private String token(Instant issuedAt, Instant expiresAt) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject("42")
                .claim("email", "recruiter@example.com")
                .claim("role", "RECRUITER")
                .claim("departmentId", 7L)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }
}
