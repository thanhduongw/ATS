package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.LoginRequest;
import iuh.fit.se.auth.dto.response.LoginResponse;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.RefreshToken;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.entity.Tenant;
import iuh.fit.se.auth.enums.TenantStatus;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RefreshTokenRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import iuh.fit.se.auth.repository.TenantRepository;
import iuh.fit.se.auth.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoginService {

    private final TenantRepository tenantRepository;
    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public LoginResponse login(LoginRequest req) {
        Tenant tenant = tenantRepository.findByTenantCode(req.tenantCode())
                .orElseThrow(() -> new BusinessException("Sai mã công ty hoặc thông tin đăng nhập"));

        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new BusinessException("Công ty chưa được kích hoạt");
        }

        AppUser user = appUserRepository.findByTenantIdAndEmail(tenant.getId(), req.email())
                .orElseThrow(() -> new BusinessException("Sai mã công ty hoặc thông tin đăng nhập"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("Tài khoản chưa được kích hoạt");
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new BusinessException("Sai mã công ty hoặc thông tin đăng nhập");
        }

        Role role = roleRepository.findById(user.getRoleId())
                .orElseThrow(() -> new BusinessException("Vai trò không hợp lệ"));

        return issueTokens(user, tenant.getId(), role.getName().name());
    }

    @Transactional
    public LoginResponse refreshToken(String refreshTokenValue) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new BusinessException("Refresh token không hợp lệ"));

        if (stored.isRevoked() || stored.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Refresh token đã hết hạn hoặc bị thu hồi");
        }

        AppUser user = appUserRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản"));
        Role role = roleRepository.findById(user.getRoleId())
                .orElseThrow(() -> new BusinessException("Vai trò không hợp lệ"));

        // Rotate: thu hồi refresh token cũ trước khi cấp mới
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(user, user.getTenantId(), role.getName().name());
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        refreshTokenRepository.findByToken(refreshTokenValue).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }

    private LoginResponse issueTokens(AppUser user, Long tenantId, String roleName) {
        String accessToken = jwtUtil.generateAccessToken(user.getId(), tenantId, roleName);

        String refreshTokenValue = UUID.randomUUID().toString();
        refreshTokenRepository.save(RefreshToken.builder()
                .userId(user.getId())
                .token(refreshTokenValue)
                .expiryDate(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build());

        return new LoginResponse(accessToken, refreshTokenValue);
    }
}