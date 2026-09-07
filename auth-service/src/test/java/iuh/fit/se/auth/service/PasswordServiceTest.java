package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.ForgotPasswordRequest;
import iuh.fit.se.auth.dto.request.ResetPasswordRequest;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.PasswordResetToken;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.PasswordResetTokenRepository;
import iuh.fit.se.auth.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordServiceTest {

    @Mock private AppUserRepository userRepository;
    @Mock private PasswordResetTokenRepository resetTokenRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private MailService mailService;

    @InjectMocks private PasswordService passwordService;

    @Test
    void forgotPasswordReturnsNormallyForUnknownEmail() {
        when(userRepository.findByEmailIgnoreCase("missing@example.com"))
                .thenReturn(Optional.empty());

        passwordService.forgotPassword(new ForgotPasswordRequest(" Missing@Example.com "));

        verifyNoInteractions(resetTokenRepository, passwordEncoder, mailService, refreshTokenRepository);
    }

    @Test
    void forgotPasswordStoresOnlyHashedOtp() {
        AppUser user = user();
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(org.mockito.ArgumentMatchers.matches("\\d{6}")))
                .thenReturn("bcrypt-otp-hash");

        passwordService.forgotPassword(new ForgotPasswordRequest(user.getEmail()));

        ArgumentCaptor<PasswordResetToken> tokenCaptor =
                ArgumentCaptor.forClass(PasswordResetToken.class);
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(resetTokenRepository).save(tokenCaptor.capture());
        verify(mailService).sendPasswordResetEmail(
                org.mockito.ArgumentMatchers.eq(user.getEmail()), otpCaptor.capture());
        assertTrue(otpCaptor.getValue().matches("\\d{6}"));
        assertEquals("bcrypt-otp-hash", tokenCaptor.getValue().getOtpHash());
        assertFalse(tokenCaptor.getValue().getOtpHash().equals(otpCaptor.getValue()));
        assertTrue(tokenCaptor.getValue().getExpiryDate().isAfter(LocalDateTime.now().plusMinutes(14)));
    }

    @Test
    void resetPasswordConsumesOtpAndRevokesAllRefreshTokens() {
        AppUser user = user();
        PasswordResetToken token = PasswordResetToken.builder()
                .email(user.getEmail())
                .otpHash("bcrypt-otp-hash")
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();
        when(resetTokenRepository.findTopByEmailIgnoreCaseOrderByIdDesc(user.getEmail()))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.matches("123456", "bcrypt-otp-hash")).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("new-password")).thenReturn("new-password-hash");

        passwordService.resetPassword(
                new ResetPasswordRequest(user.getEmail(), "123456", "new-password"));

        assertTrue(token.isUsed());
        assertEquals("new-password-hash", user.getPasswordHash());
        verify(userRepository).save(user);
        verify(resetTokenRepository).save(token);
        verify(refreshTokenRepository).revokeAllActiveByUserId(user.getId());
    }

    @Test
    void invalidResetOtpIncrementsAttemptCounter() {
        PasswordResetToken token = PasswordResetToken.builder()
                .email("candidate@example.com")
                .otpHash("bcrypt-otp-hash")
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .failedAttempts(2)
                .build();
        when(resetTokenRepository.findTopByEmailIgnoreCaseOrderByIdDesc(token.getEmail()))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.matches("000000", token.getOtpHash())).thenReturn(false);

        assertThrows(BusinessException.class, () -> passwordService.resetPassword(
                new ResetPasswordRequest(token.getEmail(), "000000", "new-password")));

        assertEquals(3, token.getFailedAttempts());
        verify(resetTokenRepository).save(token);
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(refreshTokenRepository, mailService);
    }

    private AppUser user() {
        return AppUser.builder()
                .id(9L)
                .email("candidate@example.com")
                .passwordHash("old-password-hash")
                .fullName("Candidate")
                .roleId(4L)
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .build();
    }
}
