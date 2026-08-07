package iuh.fit.se.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.reactive.CorsUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthGlobalFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/register-company",
            "/api/auth/resend-otp",
            "/api/auth/verify-email",
            "/api/auth/login",
            "/api/auth/refresh-token",
            "/api/auth/forgot-password",
            "/api/auth/reset-password"
    );

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtAuthGlobalFilter.class);

    @Value("${app.jwt.secret}")
    private String secret;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (CorsUtils.isPreFlightRequest(exchange.getRequest())) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();
        if (PUBLIC_PATHS.contains(path) || path.startsWith("/api/candidate/candidates/cv-file/")) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Missing or invalid Authorization header for path: {}", path);
            return unauthorized(exchange);
        }

        try {
            String token = authHeader.substring(7).trim();
            Claims claims = Jwts.parser()
                    .verifyWith(key())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", claims.getSubject())
                    .header("X-Tenant-Id", String.valueOf(claims.get("tenantId")))
                    .header("X-User-Role", String.valueOf(claims.get("role")))
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        } catch (Exception e) {
            log.error("JWT validation failed for path {}: {}", path, e.getMessage(), e);
            return unauthorized(exchange);
        }
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}