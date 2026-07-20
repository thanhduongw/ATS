package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.RegisterCompanyRequest;
import iuh.fit.se.auth.dto.request.VerifyEmailRequest;
import iuh.fit.se.auth.entity.*;
import iuh.fit.se.auth.enums.RoleName;
import iuh.fit.se.auth.enums.TenantStatus;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class RegisterService {

    private final TenantRepository tenantRepository;
    private final CompanyRepository companyRepository;
    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Value("${app.otp.expiration-minutes}")
    private int otpExpirationMinutes;

    @Transactional
    public void registerCompany(RegisterCompanyRequest req) {
        if (tenantRepository.existsByTenantCode(req.tenantCode())) {
            throw new BusinessException("Mã công ty đã tồn tại");
        }

        Tenant tenant = tenantRepository.save(Tenant.builder()
                .tenantCode(req.tenantCode())
                .status(TenantStatus.PENDING)
                .build());

        companyRepository.save(Company.builder()
                .tenantId(tenant.getId())
                .name(req.companyName())
                .build());

        Role adminRole = roleRepository.findByName(RoleName.COMPANY_ADMIN)
                .orElseThrow(() -> new IllegalStateException("Role COMPANY_ADMIN chưa được seed"));

        appUserRepository.save(AppUser.builder()
                .tenantId(tenant.getId())
                .email(req.adminEmail())
                .passwordHash(passwordEncoder.encode(req.adminPassword()))
                .fullName(req.adminFullName())
                .roleId(adminRole.getId())
                .status(UserStatus.PENDING_VERIFICATION)
                .build());

        String otp = String.format("%06d", new Random().nextInt(999999));
        emailVerificationRepository.save(EmailVerification.builder()
                .tenantId(tenant.getId())
                .email(req.adminEmail())
                .otpCode(otp)
                .expiryDate(LocalDateTime.now().plusMinutes(otpExpirationMinutes))
                .verified(false)
                .build());

        mailService.sendOtpEmail(req.adminEmail(), otp);
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest req) {
        Tenant tenant = tenantRepository.findByTenantCode(req.tenantCode())
                .orElseThrow(() -> new BusinessException("Không tìm thấy công ty"));

        EmailVerification verification = emailVerificationRepository
                .findTopByTenantIdAndEmailOrderByIdDesc(tenant.getId(), req.email())
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu xác thực"));

        if (verification.isVerified()) {
            throw new BusinessException("Email đã được xác thực");
        }
        if (verification.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BusinessException("OTP đã hết hạn, vui lòng đăng ký lại");
        }
        if (!verification.getOtpCode().equals(req.otpCode())) {
            throw new BusinessException("OTP không đúng");
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);

        tenant.setStatus(TenantStatus.ACTIVE);
        tenantRepository.save(tenant);

        AppUser user = appUserRepository.findByTenantIdAndEmail(tenant.getId(), req.email())
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản"));
        user.setStatus(UserStatus.ACTIVE);
        appUserRepository.save(user);
    }
}