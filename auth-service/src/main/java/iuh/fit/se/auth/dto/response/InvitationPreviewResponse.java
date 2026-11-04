package iuh.fit.se.auth.dto.response;

import java.time.LocalDateTime;

/** Thông tin hiển thị ở trang nhận lời mời — không có dữ liệu nhạy cảm ngoài email người được mời. */
public record InvitationPreviewResponse(
        String email,
        String fullName,
        String roleName,
        Long departmentId,
        String jobTitle,
        String invitedByName,
        String message,
        LocalDateTime expiresAt
) {}
