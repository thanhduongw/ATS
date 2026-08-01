package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.ChangePasswordRequest;
import iuh.fit.se.auth.dto.request.ForgotPasswordRequest;
import iuh.fit.se.auth.dto.request.ResetPasswordRequest;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.PasswordResetToken;
import iuh.fit.se.auth.entity.Tenant;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.PasswordResetTokenRepository;
import iuh.fit.se.auth.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PasswordService {

    private static final Logger log = LoggerFactory.getLogger(PasswordService.class);

    private final TenantRepository tenantRepository;
    private final AppUserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        Tenant tenant = tenantRepository.findByTenantCode(req.tenantCode())
                .orElseThrow(() -> new BusinessException("Không tìm thấy công ty"));

        AppUser user = userRepository.findByTenantIdAndEmail(tenant.getId(), req.email())
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng với email này"));

        // Tạo mã OTP 6 số đơn giản
        String otp = String.format("%06d", RANDOM.nextInt(1000000));

        PasswordResetToken tokenEntity = PasswordResetToken.builder()
                .tenantId(tenant.getId())
                .email(user.getEmail())
                .otpCode(otp)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();

        resetTokenRepository.save(tokenEntity);
        mailService.sendPasswordResetEmail(user.getEmail(), otp);
        log.info("Đã gửi OTP quên mật khẩu tới email: {}", user.getEmail());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        Tenant tenant = tenantRepository.findByTenantCode(req.tenantCode())
                .orElseThrow(() -> new BusinessException("Không tìm thấy công ty"));

        PasswordResetToken resetToken = resetTokenRepository
                .findTopByTenantIdAndEmailOrderByIdDesc(tenant.getId(), req.email())
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu đặt lại mật khẩu"));

        if (resetToken.isUsed()) {
            throw new BusinessException("Mã OTP đã được sử dụng");
        }

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Mã OTP đã hết hạn");
        }

        if (!resetToken.getOtpCode().equals(req.otpCode())) {
            throw new BusinessException("Mã OTP không chính xác");
        }

        AppUser user = userRepository.findByTenantIdAndEmail(tenant.getId(), req.email())
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng"));

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);

        log.info("Đã khôi phục mật khẩu thành công cho email {}", req.email());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng"));

        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu hiện tại không chính xác");
        }

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        log.info("Đã đổi mật khẩu thành công cho userId {}", userId);
    }
}
