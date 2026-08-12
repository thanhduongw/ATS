package iuh.fit.se.auth.service;

import iuh.fit.se.auth.dto.request.CreateUserRequest;
import iuh.fit.se.auth.dto.request.UpdateProfileRequest;
import iuh.fit.se.auth.dto.response.UserProfileResponse;
import iuh.fit.se.auth.dto.response.UserSummaryResponse;
import iuh.fit.se.auth.entity.AppUser;
import iuh.fit.se.auth.entity.Role;
import iuh.fit.se.auth.enums.UserStatus;
import iuh.fit.se.auth.event.AuditEventPublisher;
import iuh.fit.se.auth.exception.BusinessException;
import iuh.fit.se.auth.repository.AppUserRepository;
import iuh.fit.se.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditEventPublisher auditEventPublisher;

    public List<UserSummaryResponse> getUsers(Long tenantId, String roleFilter) {
        return appUserRepository.findByTenantId(tenantId).stream()
                .map(u -> {
                    Role role = roleRepository.findById(u.getRoleId())
                            .orElseThrow(() -> new BusinessException("Vai trò không hợp lệ"));

                    return new UserSummaryResponse(
                            u.getId(),
                            u.getFullName(),
                            u.getEmail(),
                            role.getName().name()
                    );
                })
                .filter(r -> roleFilter == null
                        || roleFilter.equalsIgnoreCase(r.role()))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {

        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() ->
                        new BusinessException("Không tìm thấy người dùng"));

        Role role = roleRepository.findById(user.getRoleId())
                .orElseThrow(() ->
                        new BusinessException("Vai trò không hợp lệ"));

        return new UserProfileResponse(
                user.getId(),
                user.getTenantId(),
                user.getEmail(),
                user.getFullName(),
                role.getName().name(),
                user.getStatus().name()
        );
    }

    @Transactional
    public UserProfileResponse updateProfile(
            Long userId,
            UpdateProfileRequest req
    ) {

        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() ->
                        new BusinessException("Không tìm thấy người dùng"));

        user.setFullName(req.fullName());

        AppUser savedUser = appUserRepository.save(user);

        Role role = roleRepository.findById(savedUser.getRoleId())
                .orElseThrow(() ->
                        new BusinessException("Vai trò không hợp lệ"));

        return new UserProfileResponse(
                savedUser.getId(),
                savedUser.getTenantId(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                role.getName().name(),
                savedUser.getStatus().name()
        );
    }

    @Transactional
    public void createUser(
            Long tenantId,
            Long actorUserId,
            CreateUserRequest req
    ) {

        if (appUserRepository.existsByTenantIdAndEmail(
                tenantId,
                req.email()
        )) {
            throw new BusinessException(
                    "Email đã tồn tại trong công ty này"
            );
        }

        Role role = roleRepository.findByName(req.role())
                .orElseThrow(() ->
                        new BusinessException("Vai trò không hợp lệ"));

        appUserRepository.save(
                AppUser.builder()
                        .tenantId(tenantId)
                        .email(req.email())
                        .passwordHash(
                                passwordEncoder.encode(
                                        req.tempPassword()
                                )
                        )
                        .fullName(req.fullName())
                        .roleId(role.getId())
                        .status(UserStatus.ACTIVE)
                        .build()
        );

        auditEventPublisher.publish(
                tenantId,
                actorUserId,
                "USER_CREATED",
                "USER",
                null,
                req.email()
        );
    }
    
}