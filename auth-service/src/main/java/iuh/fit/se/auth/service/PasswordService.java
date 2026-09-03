package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.ChangePasswordRequest;
import iuh.fit.se.auth.dto.request.ForgotPasswordRequest;
import iuh.fit.se.auth.dto.request.ResetPasswordRequest;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.PasswordResetToken;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.PasswordResetTokenRepository;
import iuh.fit.se.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PasswordService {

    private static final Logger log = LoggerFactory.getLogger(PasswordService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final AppUserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    /** Always returns normally so callers cannot enumerate registered email addresses. */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        String normalizedEmail = normalizeEmail(req.email());
        Optional<AppUser> optionalUser = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (optionalUser.isEmpty()) {
            log.info("Password reset requested for an unknown address");
            return;
        }

        AppUser user = optionalUser.get();
        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        resetTokenRepository.save(PasswordResetToken.builder()
                .email(user.getEmail())
                .otpHash(passwordEncoder.encode(otp))
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .failedAttempts(0)
                .build());
        mailService.sendPasswordResetEmail(user.getEmail(), otp);
        log.info("Password reset OTP sent");
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public void resetPassword(ResetPasswordRequest req) {
        String normalizedEmail = normalizeEmail(req.email());
        PasswordResetToken resetToken = resetTokenRepository
                .findTopByEmailIgnoreCaseOrderByIdDesc(normalizedEmail)
                .orElseThrow(() -> new BusinessException("OTP khong hop le hoac da het han"));

        if (resetToken.isUsed() || resetToken.getExpiryDate() == null
                || !resetToken.getExpiryDate().isAfter(LocalDateTime.now())) {
            throw new BusinessException("OTP khong hop le hoac da het han");
        }
        if (resetToken.getFailedAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new BusinessException("OTP da bi khoa, vui long tao yeu cau moi");
        }
        if (!passwordEncoder.matches(req.otpCode(), resetToken.getOtpHash())) {
            resetToken.setFailedAttempts(resetToken.getFailedAttempts() + 1);
            resetTokenRepository.save(resetToken);
            throw new BusinessException(resetToken.getFailedAttempts() >= MAX_OTP_ATTEMPTS
                    ? "OTP da bi khoa, vui long tao yeu cau moi"
                    : "OTP khong hop le hoac da het han");
        }

        AppUser user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new BusinessException("OTP khong hop le hoac da het han"));
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);
        refreshTokenRepository.revokeAllActiveByUserId(user.getId());
        log.info("Password reset completed for user {}", user.getId());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User was not found"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is invalid");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllActiveByUserId(user.getId());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
