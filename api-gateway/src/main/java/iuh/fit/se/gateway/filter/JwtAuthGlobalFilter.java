package iuh.fit.se.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.reactive.CorsUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Component
public class JwtAuthGlobalFilter implements GlobalFilter, Ordered {

    static final String USER_ID_HEADER = "X-User-Id";
    static final String USER_EMAIL_HEADER = "X-User-Email";
    static final String USER_ROLE_HEADER = "X-User-Role";
    static final String DEPARTMENT_ID_HEADER = "X-Department-Id";

    private static final Logger log = LoggerFactory.getLogger(JwtAuthGlobalFilter.class);
    private static final Set<String> ALLOWED_ROLES = Set.of(
            "COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER", "CANDIDATE"
    );
    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/auth/register",
            "/api/auth/resend-otp",
            "/api/auth/verify-email",
            "/api/auth/login",
            "/api/auth/refresh-token",
            "/api/auth/logout",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/oauth2/exchange"
    );

    /**
     * Google SSO chay qua chinh entrypoint cong khai: browser khong the gan Authorization
     * cho cac buoc redirect nay, nen chung phai public o gateway. Danh tinh that su duoc
     * auth-service tu quyet dinh sau khi Google tra ve; identity header cua client van bi xoa.
     */
    static final String OAUTH2_PRE_LOGIN_PATH = "/api/auth/oauth2/pre-login";
    static final String OAUTH2_AUTHORIZATION_PATH_PREFIX = "/api/auth/oauth2/authorization/";
    static final String OAUTH2_CALLBACK_PATH_PREFIX = "/api/auth/login/oauth2/code/";

    /**
     * SockJS/STOMP handshake: browser WebSocket API khong gui duoc header Authorization,
     * nen JWT duoc ep o STOMP CONNECT frame trong notification-service. Gateway chi cho qua
     * va van xoa moi X-User-* do client tu gui.
     */
    static final String WEBSOCKET_PATH_PREFIX = "/ws/";

    @Value("${app.jwt.secret}")
    private String secret;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (CorsUtils.isPreFlightRequest(exchange.getRequest()) || isPublicRequest(exchange)) {
            return chain.filter(stripIdentityHeaders(exchange));
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("Missing bearer token for protected path {}", exchange.getRequest().getPath());
            return unauthorized(exchange);
        }

        try {
            String token = authHeader.substring(7).trim();
            if (token.isEmpty()) {
                return unauthorized(exchange);
            }

            Claims claims = Jwts.parser()
                    .verifyWith(key())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            GatewayUserContext user = parseUserContext(claims);

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .headers(headers -> {
                        removeIdentityHeaders(headers);
                        headers.set(USER_ID_HEADER, user.userId().toString());
                        headers.set(USER_EMAIL_HEADER, user.email());
                        headers.set(USER_ROLE_HEADER, user.role());
                        if (user.departmentId() != null) {
                            headers.set(DEPARTMENT_ID_HEADER, user.departmentId().toString());
                        }
                    })
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        } catch (Exception ex) {
            log.debug("JWT validation failed for protected path {}: {}",
                    exchange.getRequest().getPath(), ex.getMessage());
            return unauthorized(exchange);
        }
    }

    private GatewayUserContext parseUserContext(Claims claims) {
        if (claims.getExpiration() == null) {
            throw new IllegalArgumentException("Missing expiration claim");
        }
        Long userId = parsePositiveLong(claims.getSubject(), "subject");
        String email = requiredString(claims.get("email"), "email");
        String role = requiredString(claims.get("role"), "role");
        if (!ALLOWED_ROLES.contains(role)) {
            throw new IllegalArgumentException("Unsupported role claim");
        }

        Object departmentClaim = claims.get("departmentId");
        Long departmentId = departmentClaim == null
                ? null
                : parsePositiveLong(String.valueOf(departmentClaim), "departmentId");
        return new GatewayUserContext(userId, email, role, departmentId);
    }

    private Long parsePositiveLong(String value, String claimName) {
        try {
            long parsed = Long.parseLong(value);
            if (parsed <= 0) {
                throw new IllegalArgumentException(claimName + " must be positive");
            }
            return parsed;
        } catch (NumberFormatException | NullPointerException ex) {
            throw new IllegalArgumentException("Invalid " + claimName + " claim", ex);
        }
    }

    private String requiredString(Object value, String claimName) {
        if (!(value instanceof String text) || text.isBlank()) {
            throw new IllegalArgumentException("Missing " + claimName + " claim");
        }
        return text;
    }

    private boolean isPublicRequest(ServerWebExchange exchange) {
        String path = exchange.getRequest().getURI().getPath();
        HttpMethod method = exchange.getRequest().getMethod();

        if (HttpMethod.POST.equals(method) && PUBLIC_AUTH_PATHS.contains(path)) {
            return true;
        }
        if (HttpMethod.GET.equals(method) && path.startsWith("/api/recruitment/public/")) {
            return true;
        }
        if (HttpMethod.GET.equals(method) && "/api/auth/public/company".equals(path)) {
            return true;
        }
        if (HttpMethod.GET.equals(method) && isOauth2EntrypointPath(path)) {
            return true;
        }
        if (path.startsWith(WEBSOCKET_PATH_PREFIX)) {
            return true;
        }
        return path.startsWith("/swagger-ui") || path.contains("/v3/api-docs");
    }

    private boolean isOauth2EntrypointPath(String path) {
        return OAUTH2_PRE_LOGIN_PATH.equals(path)
                || path.startsWith(OAUTH2_AUTHORIZATION_PATH_PREFIX)
                || path.startsWith(OAUTH2_CALLBACK_PATH_PREFIX);
    }

    private ServerWebExchange stripIdentityHeaders(ServerWebExchange exchange) {
        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(this::removeIdentityHeaders)
                .build();
        return exchange.mutate().request(request).build();
    }

    private void removeIdentityHeaders(HttpHeaders headers) {
        headers.remove(USER_ID_HEADER);
        headers.remove(USER_EMAIL_HEADER);
        headers.remove(USER_ROLE_HEADER);
        headers.remove(DEPARTMENT_ID_HEADER);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private record GatewayUserContext(Long userId, String email, String role, Long departmentId) {
    }
}
