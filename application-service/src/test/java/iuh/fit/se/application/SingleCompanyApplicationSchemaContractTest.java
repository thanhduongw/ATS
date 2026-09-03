package iuh.fit.se.application;

import iuh.fit.se.application.application.Application;
import iuh.fit.se.application.application.ApplicationComment;
import iuh.fit.se.application.application.ApplicationRepository;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class SingleCompanyApplicationSchemaContractTest {

    @Test
    void applicationKeepsCandidateAndPostingReferencesWithoutTenant() throws Exception {
        assertNoTenantField(Application.class, ApplicationComment.class);
        assertNotNull(Application.class.getDeclaredField("candidateId"));
        assertNotNull(Application.class.getDeclaredField("jobPostingId"));
        assertNotNull(Application.class.getDeclaredField("departmentId"));
        assertNotNull(Application.class.getDeclaredField("pipelineId"));
        assertFalse(Arrays.stream(ApplicationRepository.class.getDeclaredMethods())
                .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
    }

    private void assertNoTenantField(Class<?>... types) {
        for (Class<?> type : types) assertFalse(Arrays.stream(type.getDeclaredFields())
                .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
    }
}
