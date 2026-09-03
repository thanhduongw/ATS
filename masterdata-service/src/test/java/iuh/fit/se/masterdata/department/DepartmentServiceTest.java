package iuh.fit.se.masterdata.department;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {

    @Mock
    private DepartmentRepository repository;

    @InjectMocks
    private DepartmentService service;

    @Test
    void onlyActiveDepartmentIsValidForInternalUserCreation() {
        Department active = Department.builder().id(10L).name("Engineering").active(true).build();
        Department inactive = Department.builder().id(11L).name("Legacy").active(false).build();
        when(repository.findById(10L)).thenReturn(Optional.of(active));
        when(repository.findById(11L)).thenReturn(Optional.of(inactive));
        when(repository.findById(12L)).thenReturn(Optional.empty());

        assertTrue(service.existsActive(10L));
        assertFalse(service.existsActive(11L));
        assertFalse(service.existsActive(12L));
    }
}
