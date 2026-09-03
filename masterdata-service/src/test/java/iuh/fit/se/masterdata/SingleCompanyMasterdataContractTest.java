package iuh.fit.se.masterdata;

import iuh.fit.se.masterdata.department.Department;
import iuh.fit.se.masterdata.department.DepartmentRepository;
import iuh.fit.se.masterdata.pipeline.RecruitmentPipeline;
import iuh.fit.se.masterdata.skill.Skill;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;

class SingleCompanyMasterdataContractTest {

    @Test
    void masterdataEntitiesAndRepositoryAreGlobal() {
        for (Class<?> type : new Class<?>[]{Department.class, Skill.class, RecruitmentPipeline.class}) {
            assertFalse(Arrays.stream(type.getDeclaredFields())
                    .anyMatch(field -> field.getName().toLowerCase().contains("tenant")));
        }
        assertFalse(Arrays.stream(DepartmentRepository.class.getDeclaredMethods())
                .anyMatch(method -> method.getName().toLowerCase().contains("tenant")));
    }
}
