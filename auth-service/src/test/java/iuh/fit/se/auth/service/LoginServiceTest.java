package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.LoginRequest;
import iuh.fit.se.auth.dto.response.LoginResponse;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.RefreshToken;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.enums.RoleName;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.event.AuditEventPublisher;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RefreshTokenRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import iuh.fit.se.auth.security.JwtUtil;
import iuh.fit.se.auth.security.OpaqueTokenUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoginServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuditEventPublisher auditEventPublisher;

    @InjectMocks private LoginService loginService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(loginService, "refreshTokenExpirationMs", 604_800_000L);
    }

    @Test
    void loginStoresOnlyRefreshTokenDigest() {
        AppUser user = user(UserStatus.ACTIVE);
        Role role = new Role(3L, RoleName.RECRUITER);
        when(appUserRepository.findByEmailIgnoreCase("recruiter@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-password", user.getPasswordHash())).thenReturn(true);
        when(roleRepository.findById(user.getRoleId())).thenReturn(Optional.of(role));
        when(jwtUtil.generateAccessToken(user.getId(), user.getEmail(), "RECRUITER", user.getDepartmentId()))
                .thenReturn("access-token");

        LoginResponse response = loginService.login(
                new LoginRequest(" Recruiter@Example.com ", "correct-password"));

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken stored = captor.getValue();
        assertEquals("access-token", response.accessToken());
        assertNotNull(response.refreshToken());
        assertEquals(OpaqueTokenUtil.sha256(response.refreshToken()), stored.getTokenHash());
        assertNotEquals(response.refreshToken(), stored.getTokenHash());
        assertEquals(64, stored.getTokenHash().length());
        assertFalse(stored.isRevoked());
        assertTrue(stored.getExpiryDate().isAfter(LocalDateTime.now().plusDays(6)));
    }

    @Test
    void loginRejectsWrongPassword() {
        AppUser user = user(UserStatus.ACTIVE);
        when(appUserRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", user.getPasswordHash())).thenReturn(false);

        assertThrows(BusinessException.class, () ->
                loginService.login(new LoginRequest(user.getEmail(), "wrong-password")));

        verifyNoInteractions(roleRepository, refreshTokenRepository, jwtUtil);
    }

    @Test
    void refreshRotatesTokenAndRevokesPreviousToken() {
        String rawToken = "old-refresh-token";
        RefreshToken stored = token(rawToken, false, LocalDateTime.now().plusHours(1));
        AppUser user = user(UserStatus.ACTIVE);
        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256(rawToken)))
                .thenReturn(Optional.of(stored));
        when(appUserRepository.findById(7L)).thenReturn(Optional.of(user));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(new Role(3L, RoleName.RECRUITER)));
        when(jwtUtil.generateAccessToken(any(), any(), any(), any())).thenReturn("new-access-token");

        LoginResponse response = loginService.refreshToken(rawToken);

        assertTrue(stored.isRevoked());
        assertEquals("new-access-token", response.accessToken());
        assertNotEquals(rawToken, response.refreshToken());
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        List<RefreshToken> writes = captor.getAllValues();
        assertTrue(writes.get(0).isRevoked());
        assertEquals(OpaqueTokenUtil.sha256(response.refreshToken()), writes.get(1).getTokenHash());
    }

    @Test
    void revokedRefreshTokenCannotBeReused() {
        String rawToken = "revoked-refresh-token";
        RefreshToken stored = token(rawToken, true, LocalDateTime.now().plusHours(1));
        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256(rawToken)))
                .thenReturn(Optional.of(stored));

        assertThrows(BusinessException.class, () -> loginService.refreshToken(rawToken));

        verify(refreshTokenRepository, never()).save(any());
        verifyNoInteractions(appUserRepository, roleRepository, jwtUtil);
    }

    @Test
    void expiredRefreshTokenIsRejected() {
        String rawToken = "expired-refresh-token";
        RefreshToken stored = token(rawToken, false, LocalDateTime.now().minusSeconds(1));
        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256(rawToken)))
                .thenReturn(Optional.of(stored));

        assertThrows(BusinessException.class, () -> loginService.refreshToken(rawToken));

        verify(refreshTokenRepository, never()).save(any());
        verifyNoInteractions(appUserRepository, roleRepository, jwtUtil);
    }

    @Test
    void refreshedAccessTokenUsesCurrentUserClaims() {
        String rawToken = "refresh-token";
        RefreshToken stored = token(rawToken, false, LocalDateTime.now().plusHours(1));
        AppUser user = user(UserStatus.ACTIVE);
        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256(rawToken)))
                .thenReturn(Optional.of(stored));
        when(appUserRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(roleRepository.findById(user.getRoleId()))
                .thenReturn(Optional.of(new Role(3L, RoleName.RECRUITER)));
        when(jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), "RECRUITER", user.getDepartmentId()))
                .thenReturn("new-access-token");

        LoginResponse response = loginService.refreshToken(rawToken);

        assertEquals("new-access-token", response.accessToken());
        verify(jwtUtil).generateAccessToken(
                7L, "recruiter@example.com", "RECRUITER", 12L);
    }

    @Test
    void refreshTokenRevokedByLogoutCannotBeReused() {
        String rawToken = "logout-then-refresh-token";
        RefreshToken stored = token(rawToken, false, LocalDateTime.now().plusHours(1));
        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256(rawToken)))
                .thenReturn(Optional.of(stored));
        when(appUserRepository.findById(7L)).thenReturn(Optional.of(user(UserStatus.ACTIVE)));

        loginService.logout(rawToken);

        assertTrue(stored.isRevoked());
        assertThrows(BusinessException.class, () -> loginService.refreshToken(rawToken));
        verifyNoInteractions(roleRepository, jwtUtil);
    }

    @Test
    void logoutRevokesRefreshTokenAndIsIdempotentForUnknownToken() {
        String rawToken = "logout-token";
        RefreshToken stored = token(rawToken, false, LocalDateTime.now().plusHours(1));
        AppUser user = user(UserStatus.ACTIVE);
        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256(rawToken)))
                .thenReturn(Optional.of(stored));
        when(appUserRepository.findById(7L)).thenReturn(Optional.of(user));

        loginService.logout(rawToken);

        assertTrue(stored.isRevoked());
        verify(refreshTokenRepository).save(stored);
        verify(auditEventPublisher).publishSingleCompany(7L, "LOGOUT", "USER", 7L, null);

        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256("unknown")))
                .thenReturn(Optional.empty());
        loginService.logout("unknown");
    }

    @Test
    void loginRejectsUnknownEmail() {
        when(appUserRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());
        assertThrows(BusinessException.class, () ->
                loginService.login(new LoginRequest("missing@example.com", "password")));
        verifyNoInteractions(passwordEncoder, roleRepository, refreshTokenRepository, jwtUtil);
    }

    @ParameterizedTest
    @EnumSource(value = UserStatus.class, names = {"PENDING_VERIFICATION", "LOCKED", "INACTIVE"})
    void loginRejectsUserThatIsNotActive(UserStatus status) {
        AppUser user = user(status);
        when(appUserRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-password", user.getPasswordHash())).thenReturn(true);
        assertThrows(BusinessException.class, () ->
                loginService.login(new LoginRequest(user.getEmail(), "correct-password")));
        verifyNoInteractions(roleRepository, refreshTokenRepository, jwtUtil);
    }

    @Test
    void refreshRejectsLockedAccountWithoutRevokingToken() {
        String rawToken = "refresh-token";
        RefreshToken stored = token(rawToken, false, LocalDateTime.now().plusHours(1));
        when(refreshTokenRepository.findForUpdateByTokenHash(OpaqueTokenUtil.sha256(rawToken)))
                .thenReturn(Optional.of(stored));
        when(appUserRepository.findById(7L)).thenReturn(Optional.of(user(UserStatus.LOCKED)));

        assertThrows(BusinessException.class, () -> loginService.refreshToken(rawToken));

        assertFalse(stored.isRevoked());
        verify(refreshTokenRepository, never()).save(stored);
        verifyNoInteractions(roleRepository, jwtUtil);
    }

    private RefreshToken token(String rawToken, boolean revoked, LocalDateTime expiry) {
        return RefreshToken.builder()
                .userId(7L)
                .tokenHash(OpaqueTokenUtil.sha256(rawToken))
                .expiryDate(expiry)
                .revoked(revoked)
                .build();
    }

    private AppUser user(UserStatus status) {
        return AppUser.builder()
                .id(7L)
                .email("recruiter@example.com")
                .passwordHash("encoded-password")
                .fullName("Recruiter")
                .roleId(3L)
                .departmentId(12L)
                .status(status)
                .emailVerified(status == UserStatus.ACTIVE)
                .build();
    }
}
