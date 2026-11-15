package iuh.fit.se.candidate.candidate.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record CandidateSelfResponse(
        String fullName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String currentPosition,
        Long educationLevelId,
        String educationLevelName,
        List<Long> skillIds,
        List<String> skillNames,
        boolean resumeUploaded,
        String resumeUrl,
        // C17: lúc tải CV hiện tại; C18: lúc ứng viên đồng ý xử lý dữ liệu (null nếu chưa có).
        LocalDateTime resumeUploadedAt,
        LocalDateTime consentAt
) {}
