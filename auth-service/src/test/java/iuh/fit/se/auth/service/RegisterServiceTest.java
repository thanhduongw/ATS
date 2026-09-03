package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.CandidateRegistrationRequest;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegisterServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private EmailVerificationRepository emailVerificationRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private MailService mailService;
    @Mock private CandidateRegistrationPublisher candidateRegistrationPublisher;

    @InjectMocks
    private RegisterService registerService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(registerService, "otpExpirationMinutes", 10);
    }

    @Test
    void candidateRegistrationHardCodesCandidateSecurityAttributes() {
        CandidateRegistrationRequest request = new CandidateRegistrationRequest(
                " Nguyen Van A ", " Candidate@Example.com ",
                "strong-password", "strong-password", " 0900000000 ");
        Role candidateRole = new Role(4L, RoleName.CANDIDATE);

        when(appUserRepository.existsByEmailIgnoreCase("candidate@example.com")).thenReturn(false);
        when(roleRepository.findByName(RoleName.CANDIDATE)).thenReturn(Optional.of(candidateRole));
        when(passwordEncoder.encode(request.password())).thenReturn("bcrypt-hash");
        when(passwordEncoder.encode(org.mockito.ArgumentMatchers.matches("\\d{6}")))
                .thenReturn("bcrypt-otp-hash");
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser user = invocation.getArgument(0);
            user.setId(42L);
            return user;
        });
        when(emailVerificationRepository.save(any(EmailVerification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        registerService.registerCandidate(request);

        ArgumentCaptor<AppUser> userCaptor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(userCaptor.capture());
        AppUser user = userCaptor.getValue();
        assertEquals("candidate@example.com", user.getEmail());
        assertEquals("Nguyen Van A", user.getFullName());
        assertEquals("0900000000", user.getPhone());
        assertEquals(4L, user.getRoleId());
        assertEquals(UserStatus.PENDING_VERIFICATION, user.getStatus());
        assertNull(user.getDepartmentId());
        assertFalse(user.isEmailVerified());
        assertEquals("bcrypt-hash", user.getPasswordHash());

        verify(candidateRegistrationPublisher).publish(new CandidateRegisteredEvent(
                42L, "Nguyen Van A", "candidate@example.com", "0900000000"));
        verify(mailService).sendOtpEmail(
                org.mockito.ArgumentMatchers.eq("candidate@example.com"),
                org.mockito.ArgumentMatchers.matches("\\d{6}"));
        ArgumentCaptor<EmailVerification> verificationCaptor =
                ArgumentCaptor.forClass(EmailVerification.class);
        verify(emailVerificationRepository).save(verificationCaptor.capture());
        assertEquals("bcrypt-otp-hash", verificationCaptor.getValue().getOtpHash());
        assertEquals(0, verificationCaptor.getValue().getFailedAttempts());
    }

    @Test
    void verifyEmailActivatesPendingCandidateWithHashedOtp() {
        AppUser user = AppUser.builder()
                .id(42L)
                .email("candidate@example.com")
                .passwordHash("bcrypt-password")
                .fullName("Candidate")
                .roleId(4L)
                .status(UserStatus.PENDING_VERIFICATION)
                .emailVerified(false)
                .build();
        EmailVerification verification = EmailVerification.builder()
                .email(user.getEmail())
                .otpHash("bcrypt-otp-hash")
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .verified(false)
                .build();
        when(emailVerificationRepository.findTopByEmailIgnoreCaseOrderByIdDesc(user.getEmail()))
                .thenReturn(Optional.of(verification));
        when(passwordEncoder.matches("123456", "bcrypt-otp-hash")).thenReturn(true);
        when(appUserRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(new Role(4L, RoleName.CANDIDATE)));

        registerService.verifyEmail(new VerifyEmailRequest(user.getEmail(), "123456"));

        assertTrue(verification.isVerified());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        assertTrue(user.isEmailVerified());
        verify(emailVerificationRepository).save(verification);
        verify(appUserRepository).save(user);
    }

    @Test
    void rejectsPasswordConfirmationMismatchBeforeWritingData() {
        CandidateRegistrationRequest request = new CandidateRegistrationRequest(
                "Candidate", "candidate@example.com", "password-one", "password-two", null);
        when(appUserRepository.existsByEmailIgnoreCase(request.email())).thenReturn(false);

        assertThrows(BusinessException.class, () -> registerService.registerCandidate(request));

        verify(appUserRepository, never()).save(any());
        verifyNoInteractions(roleRepository, passwordEncoder, emailVerificationRepository,
                mailService, candidateRegistrationPublisher);
    }
}
