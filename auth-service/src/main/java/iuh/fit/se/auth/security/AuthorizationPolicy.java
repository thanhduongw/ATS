package iuh.fit.se.auth.security;

import org.springframework.security.access.AccessDeniedException;

import java.util.Arrays;
import java.util.Objects;

public final class AuthorizationPolicy {

    public enum Role {
        COMPANY_ADMIN,
        RECRUITER,
        HIRING_MANAGER,
        CANDIDATE
    }

    private AuthorizationPolicy() {
    }

    public static Role roleOf(CurrentUser actor) {
        Objects.requireNonNull(actor, "actor");
        try {
            return Role.valueOf(actor.role());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw denied("Unsupported role");
        }
    }

    public static void requireRole(CurrentUser actor, Role role) {
        requireAnyRole(actor, role);
    }

    public static void requireAnyRole(CurrentUser actor, Role... roles) {
        Role actual = roleOf(actor);
        if (Arrays.stream(roles).noneMatch(actual::equals)) {
            throw denied("Role " + actual + " cannot perform this action");
        }
    }

    public static void requireAdmin(CurrentUser actor) {
        requireRole(actor, Role.COMPANY_ADMIN);
    }

    public static void requireInternal(CurrentUser actor) {
        requireAnyRole(actor, Role.COMPANY_ADMIN, Role.RECRUITER, Role.HIRING_MANAGER);
    }

    public static void requireHr(CurrentUser actor) {
        requireAnyRole(actor, Role.COMPANY_ADMIN, Role.RECRUITER);
    }

    public static void requireHiringManager(CurrentUser actor) {
        requireAnyRole(actor, Role.COMPANY_ADMIN, Role.HIRING_MANAGER);
    }

    public static void requireCandidate(CurrentUser actor) {
        requireRole(actor, Role.CANDIDATE);
    }

    public static void requireSameDepartment(CurrentUser actor, Long resourceDepartmentId) {
        if (roleOf(actor) == Role.COMPANY_ADMIN) {
            return;
        }
        requireInternal(actor);
        if (actor.departmentId() == null || resourceDepartmentId == null
                || !actor.departmentId().equals(resourceDepartmentId)) {
            throw denied("Resource belongs to another department");
        }
    }

    public static void requireSelf(CurrentUser actor, Long targetUserId) {
        if (targetUserId == null || !actor.userId().equals(targetUserId)) {
            throw denied("Only the resource owner can perform this action");
        }
    }

    public static void requireOwnerOrAdmin(CurrentUser actor, Long ownerId) {
        if (roleOf(actor) != Role.COMPANY_ADMIN) {
            requireSelf(actor, ownerId);
        }
    }

    public static void requireAssignedOrAdmin(CurrentUser actor, Long assignedUserId) {
        requireOwnerOrAdmin(actor, assignedUserId);
    }

    public static boolean canAccessCandidate(
            CurrentUser actor, Long candidateUserId, Long resourceDepartmentId, Long assignedRecruiterId) {
        return switch (roleOf(actor)) {
            case COMPANY_ADMIN -> true;
            case CANDIDATE -> candidateUserId != null && candidateUserId.equals(actor.userId());
            case RECRUITER -> isSameDepartment(actor, resourceDepartmentId)
                    || Objects.equals(actor.userId(), assignedRecruiterId);
            case HIRING_MANAGER -> isSameDepartment(actor, resourceDepartmentId);
        };
    }

    public static boolean canAccessApplication(
            CurrentUser actor, Long candidateUserId, Long resourceDepartmentId, Long assignedRecruiterId) {
        return canAccessCandidate(actor, candidateUserId, resourceDepartmentId, assignedRecruiterId);
    }

    public static boolean canManageJob(
            CurrentUser actor, Long resourceDepartmentId, Long requesterId, Long approverId) {
        return switch (roleOf(actor)) {
            case COMPANY_ADMIN -> true;
            case CANDIDATE -> false;
            case RECRUITER -> isSameDepartment(actor, resourceDepartmentId)
                    || Objects.equals(actor.userId(), approverId);
            case HIRING_MANAGER -> isSameDepartment(actor, resourceDepartmentId)
                    && (requesterId == null || Objects.equals(actor.userId(), requesterId));
        };
    }

    private static boolean isSameDepartment(CurrentUser actor, Long resourceDepartmentId) {
        return actor.departmentId() != null && resourceDepartmentId != null
                && actor.departmentId().equals(resourceDepartmentId);
    }

    private static AccessDeniedException denied(String message) {
        return new AccessDeniedException(message);
    }
}
