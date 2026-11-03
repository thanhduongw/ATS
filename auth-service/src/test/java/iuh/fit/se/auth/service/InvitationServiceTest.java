package iuh.fit.se.auth.service;

import iuh.fit.se.auth.client.DepartmentDirectoryClient;
import iuh.fit.se.auth.dto.request.AcceptInvitationRequest;
import iuh.fit.se.auth.dto.request.InviteUserRequest;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.entity.UserInvitation;
import iuh.fit.se.auth.enums.RoleName;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.event.AuditEventPublisher;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import iuh.fit.se.auth.repository.UserInvitationRepository;
import iuh.fit.se.auth.security.CurrentUser;
import iuh.fit.se.auth.security.OpaqueTokenUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Mời người dùng qua email (docs/UI A03, A04; quyết định C2). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InvitationServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserInvitationRepository invitationRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditEventPublisher auditEventPublisher;
    @Mock private DepartmentDirectoryClient departmentDirectoryClient;
    @Mock private MailService mailService;

    @InjectMocks private InvitationService invitationService;

    private final CurrentUser admin = new CurrentUser(1L, "admin@vexo.vn", "COMPANY_ADMIN", null);

    @Test
    void inviteCreatesPendingUserStoresOnlyTokenHashAndEmailsTheLink() {
        when(appUserRepository.existsByEmailIgnoreCase("van.le@vexo.vn")).thenReturn(false);
        when(departmentDirectoryClient.existsActive(9L, admin)).thenReturn(true);
        when(roleRepository.findByName(RoleName.HIRING_MANAGER)).thenReturn(Optional.of(new Role(3L, RoleName.HIRING_MANAGER)));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        invitationService.invite(admin, new InviteUserRequest(
                "Lê Thị Thanh Vân", " Van.Le@vexo.vn ", RoleName.HIRING_MANAGER, 9L, "Trưởng nhóm Marketing", "Chào Vân"));

        ArgumentCaptor<AppUser> user = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(user.capture());
        assertThat(user.getValue().getEmail()).isEqualTo("van.le@vexo.vn");
        assertThat(user.getValue().getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);

        ArgumentCaptor<UserInvitation> inv = ArgumentCaptor.forClass(UserInvitation.class);
        verify(invitationRepository).save(inv.capture());
        assertThat(inv.getValue().getTokenHash()).hasSize(64);
        assertThat(inv.getValue().getExpiresAt()).isAfter(LocalDateTime.now().plusDays(6));

        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendInvitationEmail(eq("van.le@vexo.vn"), eq("Lê Thị Thanh Vân"), anyString(),
                eq(RoleName.HIRING_MANAGER), eq("Chào Vân"), link.capture(), eq(7));
        String token = link.getValue().substring(link.getValue().lastIndexOf('/') + 1);
        // Token gốc chỉ nằm trong email; DB chỉ có SHA-256 của nó.
        assertThat(OpaqueTokenUtil.sha256(token)).isEqualTo(inv.getValue().getTokenHash());
    }

    @Test
    void hiringManagerWithoutDepartmentIsRefused() {
        when(appUserRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        assertThrows(BusinessException.class, () -> invitationService.invite(admin, new InviteUserRequest(
                "A", "a@vexo.vn", RoleName.HIRING_MANAGER, null, null, null)));
        verify(appUserRepository, never()).save(any());
    }

    @Test
    void candidatesAreNotInvited() {
        when(appUserRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        assertThrows(BusinessException.class, () -> invitationService.invite(admin, new InviteUserRequest(
                "A", "a@gmail.com", RoleName.CANDIDATE, null, null, null)));
    }

    @Test
    void acceptSetsPasswordActivatesAndConsumesTheToken() {
        String token = "raw-token";
        UserInvitation inv = UserInvitation.builder().id(5L).userId(50L).tokenHash(OpaqueTokenUtil.sha256(token))
                .invitedByUserId(1L).expiresAt(LocalDateTime.now().plusDays(3)).build();
        AppUser user = AppUser.builder().id(50L).email("van.le@vexo.vn").fullName("Vân")
                .status(UserStatus.PENDING_VERIFICATION).build();
        when(invitationRepository.findByTokenHash(OpaqueTokenUtil.sha256(token))).thenReturn(Optional.of(inv));
        when(appUserRepository.findById(50L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("matkhau123")).thenReturn("hashed-new");

        invitationService.accept(token, new AcceptInvitationRequest("matkhau123"));

        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(inv.getAcceptedAt()).isNotNull();
        verify(appUserRepository).save(user);
    }

    @Test
    void expiredOrUsedTokenIsRefused() {
        UserInvitation expired = UserInvitation.builder().userId(50L).tokenHash(OpaqueTokenUtil.sha256("t1"))
                .invitedByUserId(1L).expiresAt(LocalDateTime.now().minusMinutes(1)).build();
        UserInvitation used = UserInvitation.builder().userId(50L).tokenHash(OpaqueTokenUtil.sha256("t2"))
                .invitedByUserId(1L).expiresAt(LocalDateTime.now().plusDays(1)).acceptedAt(LocalDateTime.now()).build();
        when(invitationRepository.findByTokenHash(OpaqueTokenUtil.sha256("t1"))).thenReturn(Optional.of(expired));
        when(invitationRepository.findByTokenHash(OpaqueTokenUtil.sha256("t2"))).thenReturn(Optional.of(used));

        assertThrows(BusinessException.class, () -> invitationService.accept("t1", new AcceptInvitationRequest("matkhau123")));
        assertThrows(BusinessException.class, () -> invitationService.preview("t2"));
        verify(mailService, never()).sendInvitationEmail(anyString(), anyString(), anyString(), any(), any(), anyString(), anyInt());
    }
}
