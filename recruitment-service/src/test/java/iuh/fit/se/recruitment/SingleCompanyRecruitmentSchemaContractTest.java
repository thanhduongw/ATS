package iuh.fit.se.recruitment;

import iuh.fit.se.recruitment.posting.JobPosting;
import iuh.fit.se.recruitment.posting.JobPostingRepository;
import iuh.fit.se.recruitment.requisition.JobRequisition;
import iuh.fit.se.recruitment.requisition.JobRequisitionRepository;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class SingleCompanyRecruitmentSchemaContractTest {

    @Test
    void recruitmentUsesDepartmentAndRequisitionWithoutTenant() throws Exception {
        assertNoTenantField(JobRequisition.class, JobPosting.class);
        assertNotNull(JobRequisition.class.getDeclaredField("departmentId"));
        assertNotNull(JobPosting.class.getDeclaredField("requisition"));
        assertNoTenantMethod(JobRequisitionRepository.class, JobPostingRepository.class);
    }

    private void assertNoTenantField(Class<?>... types) {
        for (Class<?> type : types) assertFalse(Arrays.stream(type.getDeclaredFields())
                .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
    }

    private void assertNoTenantMethod(Class<?>... types) {
        for (Class<?> type : types) assertFalse(Arrays.stream(type.getDeclaredMethods())
                .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
    }
}
