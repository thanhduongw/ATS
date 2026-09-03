package iuh.fit.se.interview;

import iuh.fit.se.interview.interview.Interview;
import iuh.fit.se.interview.interview.InterviewInterviewer;
import iuh.fit.se.interview.interview.InterviewRepository;
import iuh.fit.se.interview.scheduling.InterviewSlot;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class SingleCompanyInterviewSchemaContractTest {

    @Test
    void interviewKeepsApplicationAndInterviewerReferencesWithoutTenant() throws Exception {
        for (Class<?> type : new Class<?>[]{Interview.class, InterviewSlot.class}) {
            assertFalse(Arrays.stream(type.getDeclaredFields())
                    .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
        }
        assertNotNull(Interview.class.getDeclaredField("applicationId"));
        assertNotNull(Interview.class.getDeclaredField("departmentId"));
        assertNotNull(Interview.class.getDeclaredField("assignedRecruiterId"));
        assertNotNull(InterviewInterviewer.class.getDeclaredField("interviewerId"));
        assertFalse(Arrays.stream(InterviewRepository.class.getDeclaredMethods())
                .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
    }
}
