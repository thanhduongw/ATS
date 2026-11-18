package iuh.fit.se.auth.service;

import iuh.fit.se.auth.client.DepartmentDirectoryClient;
import iuh.fit.se.auth.dto.request.CreateUserRequest;
import iuh.fit.se.auth.dto.request.UpdateProfileRequest;
import iuh.fit.se.auth.dto.request.UpdateUserStatusRequest;
import iuh.fit.se.auth.dto.response.UserDirectoryResponse;
import iuh.fit.se.auth.dto.response.UserProfileResponse;
import iuh.fit.se.auth.dto.response.UserSummaryResponse;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.enums.RoleName;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.event.AuditEventPublisher;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import iuh.fit.se.auth.security.CurrentUser;
import iuh.fit.se.auth.security.AuthorizationPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditEventPublisher auditEventPublisher;
    private final DepartmentDirectoryClient departmentDirectoryClient;
    private final ImageStorageService imageStorageService;
    private final iuh.fit.se.auth.repository.RefreshTokenRepository refreshTokenRepository;

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsers(String roleFilter) {
        return appUserRepository.findAll().stream()
                .map(this::toSummary)
                .filter(user -> roleFilter == null || roleFilter.equalsIgnoreCase(user.role()))
                .toList();
    }

    /**
     * Internal-staff directory. Candidate accounts are excluded and no email/status is exposed,
     * so an internal role can resolve colleague names for assignment workflows without being able
     * to enumerate candidate contact data through the user API.
     */
    @Transactional(readOnly = true)
    public List<UserDirectoryResponse> getDirectory(String roleFilter) {
        return appUserRepository.findAll().stream()
                .map(user -> new UserDirectoryResponse(
                        user.getId(),
                        user.getFullName(),
                        findRole(user.getRoleId()).getName().name(),
                        user.getDepartmentId(),
                        user.getStatus() == null ? null : user.getStatus().name()))
                .filter(user -> !RoleName.CANDIDATE.name().equals(user.role()))
                .filter(user -> roleFilter == null || roleFilter.equalsIgnoreCase(user.role()))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        return toProfile(findUser(userId));
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest req) {
        AppUser user = findUser(userId);
        user.setFullName(req.fullName());
        if (req.phone() != null) {
            user.setPhone(req.phone().trim());
        }
        return toProfile(appUserRepository.save(user));
    }

    /** C17/R32: đặt hoặc gỡ (null) ảnh đại diện của chính mình. Chỉ nhận ảnh đã tải lên kho ảnh của hệ thống. */
    @Transactional
    public UserProfileResponse updateAvatar(Long userId, String avatarUrl) {
        AppUser user = findUser(userId);
        String url = avatarUrl == null || avatarUrl.isBlank() ? null : avatarUrl.trim();
        if (url != null && !imageStorageService.isStoredImage(url, "avatars")) {
            throw new BusinessException("Ảnh đại diện không hợp lệ");
        }
        user.setAvatarUrl(url);
        return toProfile(appUserRepository.save(user));
    }

    @Transactional
    public void createUser(CurrentUser actor, CreateUserRequest req) {
        AuthorizationPolicy.requireAdmin(actor);

        String email = normalizeEmail(req.email());
        if (appUserRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Email này đã có trong hệ thống");
        }

        validateInternalRole(actor, req);

        Role role = roleRepository.findByName(req.role())
                .orElseThrow(() -> new BusinessException("Vai trò không hợp lệ"));

        AppUser savedUser = appUserRepository.save(
                AppUser.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(req.tempPassword()))
                        .fullName(req.fullName().trim())
                        .phone(trimToNull(req.phone()))
                        .roleId(role.getId())
                        .departmentId(req.departmentId())
                        .status(req.status())
                        .emailVerified(true)
                        .build()
        );

        auditEventPublisher.publishSingleCompany(
                actor.userId(),
                "USER_CREATED",
                "USER",
                savedUser.getId(),
                savedUser.getEmail()
        );
    }

    @Transactional
    public void updateUserStatus(
            Long actorUserId,
            Long targetUserId,
            UpdateUserStatusRequest req
    ) {
        AppUser user = findUser(targetUserId);

        if (user.getId().equals(actorUserId)) {
            throw new BusinessException("Bạn không thể tự đổi trạng thái tài khoản của mình");
        }

        user.setStatus(req.status());
        appUserRepository.save(user);

        auditEventPublisher.publishSingleCompany(
                actorUserId,
                "USER_STATUS_UPDATED",
                "USER",
                targetUserId,
                "Trạng thái mới: " + statusLabel(req.status())
        );
        if (req.status() != UserStatus.ACTIVE) {
            // Khoá / vô hiệu hoá thì phiên đang đăng nhập cũng phải hết hiệu lực.
            refreshTokenRepository.revokeAllActiveByUserId(targetUserId);
        }
    }

    private static String statusLabel(UserStatus status) {
        return switch (status) {
            case ACTIVE -> "Hoạt động";
            case LOCKED -> "Đã khoá";
            case INACTIVE -> "Ngừng hoạt động";
            case PENDING_VERIFICATION -> "Chờ kích hoạt";
        };
    }

    private static String roleLabel(RoleName role) {
        return switch (role) {
            case COMPANY_ADMIN -> "Quản trị doanh nghiệp";
            case RECRUITER -> "Chuyên viên tuyển dụng";
            case HIRING_MANAGER -> "Đại diện phòng ban";
            case CANDIDATE -> "Ứng viên";
        };
    }

    /**
     * A05 / 3.14: Quản trị doanh nghiệp đổi vai trò, phòng ban của tài khoản nội bộ. Không tự đổi của mình, không
     * đổi tài khoản ứng viên, không biến ai thành ứng viên. Phiên đăng nhập cũ bị thu hồi để quyền mới có hiệu lực
     * ngay ở lần đăng nhập kế tiếp (role nằm trong access token).
     */
    @Transactional
    public void updateUserRole(CurrentUser actor, Long targetUserId, iuh.fit.se.auth.dto.request.UpdateUserRoleRequest req) {
        AppUser user = findUser(targetUserId);
        if (user.getId().equals(actor.userId())) {
            throw new BusinessException("Bạn không thể tự đổi vai trò của mình");
        }
        RoleName current = findRole(user.getRoleId()).getName();
        if (current == RoleName.CANDIDATE || req.role() == RoleName.CANDIDATE) {
            throw new BusinessException("Không đổi vai trò giữa ứng viên và nhân viên nội bộ");
        }
        Long departmentId = req.role() == RoleName.COMPANY_ADMIN ? null : req.departmentId();
        if (req.role() != RoleName.COMPANY_ADMIN) {
            if (departmentId == null) {
                throw new BusinessException("Vui lòng chọn phòng ban cho nhân viên nội bộ");
            }
            if (departmentId <= 0 || !departmentDirectoryClient.existsActive(departmentId, actor)) {
                throw new BusinessException("Phòng ban không tồn tại hoặc đã ngừng hoạt động");
            }
        }
        Role newRole = roleRepository.findByName(req.role())
                .orElseThrow(() -> new BusinessException("Vai trò không hợp lệ"));
        boolean roleChanged = current != req.role();
        boolean departmentChanged = !java.util.Objects.equals(user.getDepartmentId(), departmentId);
        if (!roleChanged && !departmentChanged) return;

        user.setRoleId(newRole.getId());
        user.setDepartmentId(departmentId);
        appUserRepository.save(user);
        refreshTokenRepository.revokeAllActiveByUserId(targetUserId);

        StringBuilder detail = new StringBuilder();
        if (roleChanged) detail.append("Vai trò: ").append(roleLabel(current)).append(" → ").append(roleLabel(req.role()));
        if (departmentChanged) {
            if (detail.length() > 0) detail.append("; ");
            detail.append("đổi phòng ban");
        }
        auditEventPublisher.publishSingleCompany(actor.userId(), "USER_ROLE_UPDATED", "USER", targetUserId, detail.toString());
    }

    private void validateInternalRole(CurrentUser actor, CreateUserRequest req) {
        if (req.role() == RoleName.CANDIDATE) {
            throw new BusinessException("Tài khoản ứng viên phải tự đăng ký ở cổng ứng viên");
        }
        if (req.status() != UserStatus.ACTIVE && req.status() != UserStatus.INACTIVE) {
            throw new BusinessException("Trạng thái khởi tạo phải là Hoạt động hoặc Ngừng hoạt động");
        }
        boolean departmentRequired = req.role() == RoleName.RECRUITER
                || req.role() == RoleName.HIRING_MANAGER;
        if (departmentRequired && req.departmentId() == null) {
            throw new BusinessException("Vui lòng chọn phòng ban cho nhân viên nội bộ");
        }
        if (req.departmentId() != null) {
            if (req.departmentId() <= 0) {
                throw new BusinessException("Phòng ban không hợp lệ");
            }
            if (!departmentDirectoryClient.existsActive(req.departmentId(), actor)) {
                throw new BusinessException("Phòng ban không tồn tại hoặc đã ngừng hoạt động");
            }
        }
    }

    private UserSummaryResponse toSummary(AppUser user) {
        Role role = findRole(user.getRoleId());
        return new UserSummaryResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                role.getName().name(),
                user.getDepartmentId(),
                user.getStatus().name(),
                user.getLastLoginAt()
        );
    }

    private UserProfileResponse toProfile(AppUser user) {
        Role role = findRole(user.getRoleId());
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                role.getName().name(),
                user.getDepartmentId(),
                user.getStatus().name(),
                user.isEmailVerified(),
                user.getAvatarUrl()
        );
    }

    private AppUser findUser(Long userId) {
        return appUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng"));
    }

    private Role findRole(Long roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new BusinessException("Vai trò không hợp lệ"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
