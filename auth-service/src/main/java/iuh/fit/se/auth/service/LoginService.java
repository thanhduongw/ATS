package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.LoginRequest;
import iuh.fit.se.auth.dto.response.LoginResponse;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.RefreshToken;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.event.AuditEventPublisher;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RefreshTokenRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import iuh.fit.se.auth.security.JwtUtil;
import iuh.fit.se.auth.security.OpaqueTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class LoginService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuditEventPublisher auditEventPublisher;

    @Value("${app.jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationMs;

    @Transactional
    public LoginResponse login(LoginRequest req) {
        AppUser user = appUserRepository.findByEmailIgnoreCase(normalizeEmail(req.email()))
                .orElseThrow(() -> new BusinessException("Email hoac mat khau khong chinh xac"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new BusinessException("Email hoac mat khau khong chinh xac");
        }
        requireActive(user);
        Role role = requiredRole(user);
        LoginResponse response = issueTokens(user, role.getName().name());
        auditEventPublisher.publishSingleCompany(user.getId(), "LOGIN", "USER", user.getId(), null);
        return response;
    }

    @Transactional
    public LoginResponse loginWithGoogle(String email) {
        AppUser user = appUserRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(
                        "Tai khoan chua duoc dang ky. Vui long lien he quan tri vien."));
        requireActive(user);
        Role role = requiredRole(user);
        LoginResponse response = issueTokens(user, role.getName().name());
        auditEventPublisher.publishSingleCompany(
                user.getId(), "LOGIN_GOOGLE", "USER", user.getId(), null);
        return response;
    }

    @Transactional
    public LoginResponse refreshToken(String rawRefreshToken) {
        String tokenHash = OpaqueTokenUtil.sha256(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findForUpdateByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessException("Refresh token khong hop le"));

        LocalDateTime now = LocalDateTime.now();
        if (stored.isRevoked() || stored.getExpiryDate() == null
                || !stored.getExpiryDate().isAfter(now)) {
            throw new BusinessException("Refresh token da het han hoac bi thu hoi");
        }

        AppUser user = appUserRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException("Khong tim thay tai khoan"));
        requireActive(user);
        Role role = requiredRole(user);

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return issueTokens(user, role.getName().name());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        String tokenHash = OpaqueTokenUtil.sha256(rawRefreshToken);
        refreshTokenRepository.findForUpdateByTokenHash(tokenHash).ifPresent(refreshToken -> {
            if (!refreshToken.isRevoked()) {
                refreshToken.setRevoked(true);
                refreshTokenRepository.save(refreshToken);
                appUserRepository.findById(refreshToken.getUserId()).ifPresent(user ->
                        auditEventPublisher.publishSingleCompany(
                                user.getId(), "LOGOUT", "USER", user.getId(), null));
            }
        });
    }

    private LoginResponse issueTokens(AppUser user, String roleName) {
        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), roleName, user.getDepartmentId());
        String rawRefreshToken = OpaqueTokenUtil.generate();
        refreshTokenRepository.save(RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(OpaqueTokenUtil.sha256(rawRefreshToken))
                .expiryDate(LocalDateTime.now().plus(Duration.ofMillis(refreshTokenExpirationMs)))
                .revoked(false)
                .build());
        return new LoginResponse(accessToken, rawRefreshToken);
    }

    private Role requiredRole(AppUser user) {
        return roleRepository.findById(user.getRoleId())
                .orElseThrow(() -> new BusinessException("Vai tro khong hop le"));
    }

    private void requireActive(AppUser user) {
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new BusinessException("Tai khoan da bi khoa");
        }
        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new BusinessException("Tai khoan da bi vo hieu hoa");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("Tai khoan chua duoc kich hoat");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
