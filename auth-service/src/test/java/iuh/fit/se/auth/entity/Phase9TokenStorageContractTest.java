package iuh.fit.se.auth.entity;

import iuh.fit.se.auth.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Phase9TokenStorageContractTest {

    @Test
    void runtimeEntitiesExposeOnlyTokenAndOtpHashes() {
        assertHasField(RefreshToken.class, "tokenHash");
        assertHasField(EmailVerification.class, "otpHash");
        assertHasField(PasswordResetToken.class, "otpHash");

        assertHasNoField(RefreshToken.class, "token");
        assertHasNoField(EmailVerification.class, "otpCode");
        assertHasNoField(PasswordResetToken.class, "otpCode");

        assertFalse(Arrays.stream(RefreshTokenRepository.class.getMethods())
                .anyMatch(method -> method.getName().equals("findByToken")));
        assertTrue(Arrays.stream(RefreshTokenRepository.class.getMethods())
                .anyMatch(method -> method.getName().equals("findForUpdateByTokenHash")));
    }

    private void assertHasField(Class<?> type, String fieldName) {
        assertTrue(Arrays.stream(type.getDeclaredFields())
                .anyMatch(field -> field.getName().equals(fieldName)));
    }

    private void assertHasNoField(Class<?> type, String fieldName) {
        assertFalse(Arrays.stream(type.getDeclaredFields())
                .anyMatch(field -> field.getName().equals(fieldName)));
    }
}
