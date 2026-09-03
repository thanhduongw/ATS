package iuh.fit.se.offer;

import iuh.fit.se.offer.offer.Offer;
import iuh.fit.se.offer.offer.OfferRepository;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class SingleCompanyOfferSchemaContractTest {

    @Test
    void offerKeepsApplicationReferenceWithoutTenant() throws Exception {
        assertFalse(Arrays.stream(Offer.class.getDeclaredFields())
                .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
        assertNotNull(Offer.class.getDeclaredField("applicationId"));
        assertNotNull(Offer.class.getDeclaredField("departmentId"));
        assertNotNull(Offer.class.getDeclaredField("assignedRecruiterId"));
        assertFalse(Arrays.stream(OfferRepository.class.getDeclaredMethods())
                .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
    }
}
