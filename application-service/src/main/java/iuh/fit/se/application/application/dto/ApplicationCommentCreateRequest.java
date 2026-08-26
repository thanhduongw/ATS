package iuh.fit.se.application.application.dto;

import jakarta.validation.constraints.NotBlank;

public record ApplicationCommentCreateRequest(
        @NotBlank(message = "Nội dung bình luận không được để trống") String content
) {}
