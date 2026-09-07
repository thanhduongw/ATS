package iuh.fit.se.candidate;

import iuh.fit.se.candidate.candidate.Candidate;
import iuh.fit.se.candidate.candidate.CandidateRepository;
import iuh.fit.se.candidate.customfield.CustomFieldDefinition;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class SingleCompanyCandidateSchemaContractTest {

    @Test
    void candidateLinksToUserWithoutTenant() throws Exception {
        for (Class<?> type : new Class<?>[]{Candidate.class, CustomFieldDefinition.class}) {
            assertFalse(Arrays.stream(type.getDeclaredFields())
                    .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
        }
        assertNotNull(Candidate.class.getDeclaredField("userId"));
        assertFalse(Arrays.stream(CandidateRepository.class.getDeclaredMethods())
                .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
    }
}
