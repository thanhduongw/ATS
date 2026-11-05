package iuh.fit.se.interview.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Ứng viên xin dời lịch phỏng vấn — lý do bắt buộc, gửi cho HR và người phỏng vấn. */
public record CandidateDeclineRequest(
        @NotBlank(message = "Vui lòng cho biết lý do xin dời lịch")
        @Size(max = 500, message = "Lý do tối đa 500 ký tự")
        String reason
) {}
