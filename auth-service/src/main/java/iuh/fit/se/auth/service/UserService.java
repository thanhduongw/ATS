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
                        user.getDepartmentId()))
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

    @Transactional
    public void createUser(CurrentUser actor, CreateUserRequest req) {
        AuthorizationPolicy.requireAdmin(actor);

        String email = normalizeEmail(req.email());
        if (appUserRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Email da ton tai trong he thong");
        }

        validateInternalRole(actor, req);

        Role role = roleRepository.findByName(req.role())
                .orElseThrow(() -> new BusinessException("Vai tro khong hop le"));

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
            throw new BusinessException("Khong the tu thay doi trang thai cua chinh minh");
        }

        user.setStatus(req.status());
        appUserRepository.save(user);

        auditEventPublisher.publishSingleCompany(
                actorUserId,
                "USER_STATUS_UPDATED",
                "USER",
                targetUserId,
                "New status: " + req.status().name()
        );
    }

    private void validateInternalRole(CurrentUser actor, CreateUserRequest req) {
        if (req.role() == RoleName.CANDIDATE) {
            throw new BusinessException("Candidate phai dang ky qua luong candidate");
        }
        if (req.status() != UserStatus.ACTIVE && req.status() != UserStatus.INACTIVE) {
            throw new BusinessException("Trang thai khoi tao phai la ACTIVE hoac INACTIVE");
        }
        boolean departmentRequired = req.role() == RoleName.RECRUITER
                || req.role() == RoleName.HIRING_MANAGER;
        if (departmentRequired && req.departmentId() == null) {
            throw new BusinessException("Department la bat buoc cho nhan vien noi bo");
        }
        if (req.departmentId() != null) {
            if (req.departmentId() <= 0) {
                throw new BusinessException("Department khong hop le");
            }
            if (!departmentDirectoryClient.existsActive(req.departmentId(), actor)) {
                throw new BusinessException("Department khong ton tai hoac khong hoat dong");
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
                user.getStatus().name()
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
                user.isEmailVerified()
        );
    }

    private AppUser findUser(Long userId) {
        return appUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Khong tim thay nguoi dung"));
    }

    private Role findRole(Long roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new BusinessException("Vai tro khong hop le"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
