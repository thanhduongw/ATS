package iuh.fit.se.auth.dto.request;

import jakarta.validation.constraints.Size;

/** C17/R32 · Ảnh đại diện: đường dẫn trả về từ POST /api/auth/files/images (folder=avatars); null để gỡ ảnh. */
public record UpdateAvatarRequest(
        @Size(max = 1000, message = "Đường dẫn ảnh quá dài")
        String avatarUrl
) {}
