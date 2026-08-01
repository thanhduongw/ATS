package iuh.fit.se.auth.dto.request;

import iuh.fit.se.auth.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "Trạng thái người dùng không được để trống")
        UserStatus status
) {}
