package iuh.fit.se.auth.service;

import iuh.fit.se.auth.client.DepartmentDirectoryClient;
import iuh.fit.se.auth.dto.request.CreateUserRequest;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.enums.RoleName;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.event.AuditEventPublisher;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import iuh.fit.se.auth.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final CurrentUser ADMIN =
            new CurrentUser(1L, "admin@example.com", "COMPANY_ADMIN", null);

    @Mock private AppUserRepository appUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditEventPublisher auditEventPublisher;
    @Mock private DepartmentDirectoryClient departmentDirectoryClient;

    @InjectMocks
    private UserService userService;

    @Test
    void recruiterRequiresDepartment() {
        CreateUserRequest request = request(RoleName.RECRUITER, null, UserStatus.ACTIVE);
        when(appUserRepository.existsByEmailIgnoreCase(request.email())).thenReturn(false);

        assertThrows(BusinessException.class, () -> userService.createUser(ADMIN, request));

        verifyNoInteractions(roleRepository, passwordEncoder, auditEventPublisher,
                departmentDirectoryClient);
        verify(appUserRepository, never()).save(any());
    }

    @Test
    void internalUserEndpointRejectsCandidateRole() {
        CreateUserRequest request = request(RoleName.CANDIDATE, null, UserStatus.ACTIVE);
        when(appUserRepository.existsByEmailIgnoreCase(request.email())).thenReturn(false);

        assertThrows(BusinessException.class, () -> userService.createUser(ADMIN, request));

        verify(appUserRepository, never()).save(any());
    }

    @Test
    void rejectsUnknownOrInactiveDepartment() {
        CreateUserRequest request = request(RoleName.HIRING_MANAGER, 99L, UserStatus.ACTIVE);
        when(appUserRepository.existsByEmailIgnoreCase(request.email())).thenReturn(false);
        when(departmentDirectoryClient.existsActive(99L, ADMIN)).thenReturn(false);

        assertThrows(BusinessException.class, () -> userService.createUser(ADMIN, request));

        verify(appUserRepository, never()).save(any());
        verifyNoInteractions(roleRepository, passwordEncoder, auditEventPublisher);
    }

    @Test
    void rejectsNonAdminEvenWhenServiceIsCalledDirectly() {
        CurrentUser recruiter = new CurrentUser(
                2L, "recruiter@example.com", "RECRUITER", 15L);

        assertThrows(AccessDeniedException.class,
                () -> userService.createUser(recruiter,
                        request(RoleName.HIRING_MANAGER, 15L, UserStatus.ACTIVE)));

        verifyNoInteractions(appUserRepository, roleRepository, passwordEncoder,
                auditEventPublisher, departmentDirectoryClient);
    }

    @Test
    void createsRecruiterWithValidatedDepartmentAndHashedTemporaryPassword() {
        Role recruiterRole = new Role(3L, RoleName.RECRUITER);
        CreateUserRequest request = new CreateUserRequest(
                " Recruiter@Example.com ", "Recruiter Name", "temporary-password",
                RoleName.RECRUITER, "0900000000", 15L, UserStatus.ACTIVE);

        when(appUserRepository.existsByEmailIgnoreCase("recruiter@example.com")).thenReturn(false);
        when(departmentDirectoryClient.existsActive(15L, ADMIN)).thenReturn(true);
        when(roleRepository.findByName(RoleName.RECRUITER)).thenReturn(Optional.of(recruiterRole));
        when(passwordEncoder.encode(request.tempPassword())).thenReturn("encoded-password");
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser user = invocation.getArgument(0);
            user.setId(20L);
            return user;
        });

        userService.createUser(ADMIN, request);

        ArgumentCaptor<AppUser> userCaptor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(userCaptor.capture());
        AppUser savedUser = userCaptor.getValue();
        assertEquals("recruiter@example.com", savedUser.getEmail());
        assertEquals(15L, savedUser.getDepartmentId());
        assertEquals("0900000000", savedUser.getPhone());
        assertEquals(UserStatus.ACTIVE, savedUser.getStatus());
        assertEquals("encoded-password", savedUser.getPasswordHash());
        assertTrue(savedUser.isEmailVerified());
        verify(auditEventPublisher).publishSingleCompany(
                1L, "USER_CREATED", "USER", 20L, "recruiter@example.com");
    }

    @Test
    void staffDirectoryExcludesCandidateAccountsSoInternalRolesCannotEnumerateThem() {
        Role recruiterRole = new Role(2L, RoleName.RECRUITER);
        Role candidateRole = new Role(4L, RoleName.CANDIDATE);
        AppUser recruiter = AppUser.builder()
                .id(2L).email("recruiter@example.com").fullName("Recruiter Name")
                .roleId(2L).departmentId(15L).status(UserStatus.ACTIVE).build();
        AppUser candidate = AppUser.builder()
                .id(9L).email("candidate@example.com").fullName("Candidate Name")
                .roleId(4L).status(UserStatus.ACTIVE).build();

        when(appUserRepository.findAll()).thenReturn(List.of(recruiter, candidate));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(recruiterRole));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(candidateRole));

        var directory = userService.getDirectory(null);

        assertEquals(1, directory.size());
        assertEquals(2L, directory.get(0).id());
        assertEquals("Recruiter Name", directory.get(0).fullName());
        assertEquals(15L, directory.get(0).departmentId());
        assertFalse(directory.stream().anyMatch(entry -> "CANDIDATE".equals(entry.role())));
    }

    private CreateUserRequest request(RoleName role, Long departmentId, UserStatus status) {
        return new CreateUserRequest(
                "user@example.com", "Internal User", "temporary-password",
                role, null, departmentId, status);
    }
}
