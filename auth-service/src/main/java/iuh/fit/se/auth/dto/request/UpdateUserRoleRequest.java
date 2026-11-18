package iuh.fit.se.auth.dto.request;

import iuh.fit.se.auth.enums.RoleName;
import jakarta.validation.constraints.NotNull;

/** A05: đổi vai trò / phòng ban của một tài khoản nội bộ. */
public record UpdateUserRoleRequest(
        @NotNull(message = "Vui lòng chọn vai trò") RoleName role,
        Long departmentId
) {}
