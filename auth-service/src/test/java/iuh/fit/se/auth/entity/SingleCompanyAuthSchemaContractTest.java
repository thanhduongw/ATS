package iuh.fit.se.auth.entity;

import iuh.fit.se.auth.repository.CompanyRepository;
import iuh.fit.se.auth.repository.PasswordResetTokenRepository;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class SingleCompanyAuthSchemaContractTest {

    @Test
    void authEntitiesHaveNoTenantFieldAndUserKeepsDepartment() throws Exception {
        assertNoTenantField(Company.class, PasswordResetToken.class, AppUser.class, EmailVerification.class);
        assertNotNull(AppUser.class.getDeclaredField("departmentId"));
        assertRepositoryHasNoTenantMethod(CompanyRepository.class, PasswordResetTokenRepository.class);
    }

    private void assertNoTenantField(Class<?>... types) {
        for (Class<?> type : types) {
            assertFalse(Arrays.stream(type.getDeclaredFields())
                    .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
        }
    }

    private void assertRepositoryHasNoTenantMethod(Class<?>... repositories) {
        for (Class<?> repository : repositories) {
            assertFalse(Arrays.stream(repository.getDeclaredMethods())
                    .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
        }
    }
}
