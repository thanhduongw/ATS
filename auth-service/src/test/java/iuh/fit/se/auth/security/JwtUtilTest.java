package iuh.fit.se.auth.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(
                jwtUtil,
                "secret",
                "phase-one-test-secret-that-is-longer-than-256-bits");
        ReflectionTestUtils.setField(jwtUtil, "accessTokenExpirationMs", 900_000L);
    }

    @Test
    void accessTokenContainsOnlyRequiredSingleCompanyClaims() {
        long beforeGeneration = System.currentTimeMillis();

        String token = jwtUtil.generateAccessToken(
                42L, "manager@example.com", "HIRING_MANAGER", 9L);
        Claims claims = jwtUtil.parseToken(token);

        assertEquals("42", claims.getSubject());
        assertEquals("manager@example.com", claims.get("email"));
        assertEquals("HIRING_MANAGER", claims.get("role"));
        assertEquals(9L, ((Number) claims.get("departmentId")).longValue());
        assertEquals(Set.of("sub", "email", "role", "departmentId", "iat", "exp"), claims.keySet());
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());

        Date earliestExpiration = new Date(beforeGeneration + 890_000L);
        Date latestExpiration = new Date(System.currentTimeMillis() + 910_000L);
        assertTrue(claims.getExpiration().after(earliestExpiration));
        assertTrue(claims.getExpiration().before(latestExpiration));
        assertTrue(jwtUtil.isValid(token));
    }

    @Test
    void accessTokenOmitsDepartmentForCandidate() {
        String token = jwtUtil.generateAccessToken(
                77L, "candidate@example.com", "CANDIDATE", null);

        Claims claims = jwtUtil.parseToken(token);

        assertEquals(Set.of("sub", "email", "role", "iat", "exp"), claims.keySet());
        assertFalse(claims.containsKey("departmentId"));
    }
}
