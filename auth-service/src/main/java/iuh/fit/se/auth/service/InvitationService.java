package iuh.fit.se.auth.service;

import iuh.fit.se.auth.client.DepartmentDirectoryClient;
import iuh.fit.se.auth.dto.request.AcceptInvitationRequest;
import iuh.fit.se.auth.dto.request.InviteUserRequest;
import iuh.fit.se.auth.dto.response.InvitationPreviewResponse;
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
import iuh.fit.se.auth.security.AuthorizationPolicy;
import iuh.fit.se.auth.security.CurrentUser;
import iuh.fit.se.auth.security.OpaqueTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Mời người dùng nội bộ qua email (docs/UI A03, A04; quyết định C2).
 * <ul>
 *   <li>Tạo tài khoản ngay ở trạng thái PENDING_VERIFICATION ("Chờ kích hoạt" ở A03), mật khẩu ngẫu nhiên
 *       không ai biết — Quản trị doanh nghiệp không còn đặt mật khẩu hộ người khác.</li>
 *   <li>Gửi liên kết có hiệu lực 7 ngày; token chỉ dùng một lần, chỉ lưu SHA-256.</li>
 *   <li>Người được mời đặt mật khẩu → tài khoản ACTIVE.</li>
 * </ul>
 * Endpoint cũ POST /admin/users vẫn giữ cho seed/test (mặc định G8).
 */
@Service
@RequiredArgsConstructor
public class InvitationService {

    static final int VALID_DAYS = 7;

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final UserInvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditEventPublisher auditEventPublisher;
    private final DepartmentDirectoryClient departmentDirectoryClient;
    private final MailService mailService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public void invite(CurrentUser actor, InviteUserRequest req) {
        AuthorizationPolicy.requireAdmin(actor);
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (appUserRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Email đã có trong hệ thống");
        }
        validateRole(actor, req.role(), req.departmentId());
        Role role = roleRepository.findByName(req.role())
                .orElseThrow(() -> new BusinessException("Vai trò không hợp lệ"));

        AppUser user = appUserRepository.save(AppUser.builder()
                .email(email)
                // Mật khẩu ngẫu nhiên không ai biết; người được mời tự đặt khi nhận lời mời.
                .passwordHash(passwordEncoder.encode(OpaqueTokenUtil.generate()))
                .fullName(req.fullName().trim())
                .roleId(role.getId())
                .departmentId(req.departmentId())
                .status(UserStatus.PENDING_VERIFICATION)
                .emailVerified(false)
                .build());

        String token = issueToken(user.getId(), actor.userId(), trimToNull(req.jobTitle()), trimToNull(req.message()));
        mailService.sendInvitationEmail(email, user.getFullName(), inviterName(actor.userId()),
                req.role(), trimToNull(req.message()), acceptLink(token), VALID_DAYS);
        auditEventPublisher.publishSingleCompany(actor.userId(), "USER_INVITED", "USER", user.getId(), email);
    }

    /** Gửi lại lời mời cho tài khoản còn "Chờ kích hoạt": huỷ liên kết cũ, cấp liên kết mới 7 ngày. */
    @Transactional
    public void resend(CurrentUser actor, Long userId) {
        AuthorizationPolicy.requireAdmin(actor);
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng"));
        if (user.getStatus() != UserStatus.PENDING_VERIFICATION) {
            throw new BusinessException("Chỉ gửi lại lời mời cho tài khoản đang chờ kích hoạt");
        }
        UserInvitation last = invitationRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản này không được tạo bằng lời mời"));
        invitationRepository.findByUserIdAndAcceptedAtIsNullAndRevokedFalse(userId).forEach(inv -> {
            inv.setRevoked(true);
            invitationRepository.save(inv);
        });
        String token = issueToken(userId, actor.userId(), last.getJobTitle(), last.getMessage());
        RoleName role = roleRepository.findById(user.getRoleId()).map(Role::getName).orElse(null);
        mailService.sendInvitationEmail(user.getEmail(), user.getFullName(), inviterName(actor.userId()),
                role, last.getMessage(), acceptLink(token), VALID_DAYS);
        auditEventPublisher.publishSingleCompany(actor.userId(), "USER_INVITATION_RESENT", "USER", userId, user.getEmail());
    }

    @Transactional(readOnly = true)
    public InvitationPreviewResponse preview(String token) {
        UserInvitation inv = requireUsable(token);
        AppUser user = appUserRepository.findById(inv.getUserId())
                .orElseThrow(() -> new BusinessException("Lời mời không còn hiệu lực"));
        String roleName = roleRepository.findById(user.getRoleId()).map(r -> r.getName().name()).orElse(null);
        return new InvitationPreviewResponse(user.getEmail(), user.getFullName(), roleName,
                user.getDepartmentId(), inv.getJobTitle(), inviterName(inv.getInvitedByUserId()),
                inv.getMessage(), inv.getExpiresAt());
    }

    @Transactional
    public void accept(String token, AcceptInvitationRequest req) {
        UserInvitation inv = requireUsable(token);
        AppUser user = appUserRepository.findById(inv.getUserId())
                .orElseThrow(() -> new BusinessException("Lời mời không còn hiệu lực"));
        if (user.getStatus() != UserStatus.PENDING_VERIFICATION) {
            throw new BusinessException("Tài khoản đã được kích hoạt hoặc đã bị khoá");
        }
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        appUserRepository.save(user);
        inv.setAcceptedAt(LocalDateTime.now());
        invitationRepository.save(inv);
        auditEventPublisher.publishSingleCompany(user.getId(), "USER_INVITATION_ACCEPTED", "USER", user.getId(), user.getEmail());
    }

    private UserInvitation requireUsable(String token) {
        if (token == null || token.isBlank()) throw new BusinessException("Lời mời không hợp lệ");
        UserInvitation inv = invitationRepository.findByTokenHash(OpaqueTokenUtil.sha256(token))
                .orElseThrow(() -> new BusinessException("Lời mời không hợp lệ"));
        if (!inv.isUsable(LocalDateTime.now())) {
            throw new BusinessException("Lời mời đã hết hạn hoặc đã được dùng. Hãy nhờ quản trị viên gửi lại.");
        }
        return inv;
    }

    private String issueToken(Long userId, Long invitedBy, String jobTitle, String message) {
        String token = OpaqueTokenUtil.generate();
        invitationRepository.save(UserInvitation.builder()
                .userId(userId)
                .tokenHash(OpaqueTokenUtil.sha256(token))
                .invitedByUserId(invitedBy)
                .jobTitle(jobTitle)
                .message(message)
                .expiresAt(LocalDateTime.now().plusDays(VALID_DAYS))
                .build());
        return token;
    }

    private void validateRole(CurrentUser actor, RoleName role, Long departmentId) {
        if (role == RoleName.CANDIDATE) {
            throw new BusinessException("Ứng viên tự đăng ký ở trang tuyển dụng, không mời qua đây");
        }
        // A04: "Phòng ban * · Bắt buộc với Đại diện phòng ban".
        if (role == RoleName.HIRING_MANAGER && departmentId == null) {
            throw new BusinessException("Vui lòng chọn phòng ban");
        }
        if (departmentId != null && !departmentDirectoryClient.existsActive(departmentId, actor)) {
            throw new BusinessException("Phòng ban không tồn tại hoặc không hoạt động");
        }
    }

    private String inviterName(Long userId) {
        return appUserRepository.findById(userId).map(AppUser::getFullName).orElse("Quản trị doanh nghiệp");
    }

    private String acceptLink(String token) {
        return frontendUrl + "/invite/" + token;
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
