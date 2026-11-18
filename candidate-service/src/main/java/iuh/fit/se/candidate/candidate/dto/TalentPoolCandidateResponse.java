package iuh.fit.se.candidate.candidate.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Ứng viên đủ điều kiện xuất hiện trong Talent Pool (đã đồng ý riêng, chưa bị xóa) — ai-service dùng để lọc và hiển thị kết quả tìm kiếm. */
public record TalentPoolCandidateResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String currentPosition,
        String poolStatus,
        List<String> tags,
        boolean hasCv,
        LocalDateTime talentPoolConsentAt
) {}
