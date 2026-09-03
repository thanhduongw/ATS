package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.CandidateRegistrationRequest;
import iuh.fit.se.auth.dto.request.ResendOtpRequest;
import iuh.fit.se.auth.dto.request.VerifyEmailRequest;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.EmailVerification;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.enums.RoleName;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.event.CandidateRegisteredEvent;
import iuh.fit.se.auth.event.CandidateRegistrationPublisher;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.EmailVerificationRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RegisterService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final CandidateRegistrationPublisher candidateRegistrationPublisher;

    @Value("${app.otp.expiration-minutes}")
    private int otpExpirationMinutes;

    @Transactional
    public void registerCandidate(CandidateRegistrationRequest req) {
        String email = normalizeEmail(req.email());
        if (appUserRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Email da ton tai trong he thong");
        }
        if (!req.password().equals(req.confirmPassword())) {
            throw new BusinessException("Password confirmation does not match");
        }

        Role candidateRole = roleRepository.findByName(RoleName.CANDIDATE)
                .orElseThrow(() -> new IllegalStateException("Role CANDIDATE has not been seeded"));
        AppUser user = appUserRepository.save(AppUser.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(req.password()))
                .fullName(req.fullName().trim())
                .phone(trimToNull(req.phone()))
                .roleId(candidateRole.getId())
                .departmentId(null)
                .status(UserStatus.PENDING_VERIFICATION)
                .emailVerified(false)
                .build());

        String otp = createVerification(email);
        mailService.sendOtpEmail(email, otp);
        candidateRegistrationPublisher.publish(new CandidateRegisteredEvent(
                user.getId(), user.getFullName(), user.getEmail(), user.getPhone()));
    }

    /** Generic behavior prevents the resend endpoint from confirming account existence. */
    @Transactional
    public void resendOtp(ResendOtpRequest req) {
        String email = normalizeEmail(req.email());
        Optional<AppUser> optionalUser = appUserRepository.findByEmailIgnoreCase(email);
        if (optionalUser.isEmpty()) return;
        AppUser user = optionalUser.get();
        if (user.getStatus() != UserStatus.PENDING_VERIFICATION || user.isEmailVerified()) return;

        String otp = createVerification(email);
        mailService.sendOtpEmail(email, otp);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public void verifyEmail(VerifyEmailRequest req) {
        String email = normalizeEmail(req.email());
        EmailVerification verification = emailVerificationRepository
                .findTopByEmailIgnoreCaseOrderByIdDesc(email)
                .orElseThrow(() -> new BusinessException("OTP khong hop le hoac da het han"));

        if (verification.isVerified()) {
            throw new BusinessException("Email da duoc xac thuc");
        }
        if (verification.getExpiryDate() == null
                || !verification.getExpiryDate().isAfter(LocalDateTime.now())) {
            throw new BusinessException("OTP khong hop le hoac da het han");
        }
        if (verification.getFailedAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new BusinessException("OTP da bi khoa, vui long yeu cau gui lai");
        }
        if (!passwordEncoder.matches(req.otpCode(), verification.getOtpHash())) {
            verification.setFailedAttempts(verification.getFailedAttempts() + 1);
            emailVerificationRepository.save(verification);
            throw new BusinessException(verification.getFailedAttempts() >= MAX_OTP_ATTEMPTS
                    ? "OTP da bi khoa, vui long yeu cau gui lai"
                    : "OTP khong hop le hoac da het han");
        }

        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("OTP khong hop le hoac da het han"));
        Role role = roleRepository.findById(user.getRoleId())
                .orElseThrow(() -> new BusinessException("Vai tro khong hop le"));
        if (role.getName() != RoleName.CANDIDATE
                || user.getStatus() != UserStatus.PENDING_VERIFICATION) {
            throw new BusinessException("Tai khoan khong cho xac thuc qua luong candidate");
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        appUserRepository.save(user);
    }

    private String createVerification(String email) {
        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        emailVerificationRepository.save(EmailVerification.builder()
                .email(email)
                .otpHash(passwordEncoder.encode(otp))
                .expiryDate(LocalDateTime.now().plusMinutes(otpExpirationMinutes))
                .verified(false)
                .failedAttempts(0)
                .build());
        return otp;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
