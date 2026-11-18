package iuh.fit.se.candidate.event;

/** Ứng viên có CV mới — ai-service nghe để trích xuất và lập chỉ mục tìm kiếm. */
public record CvUploadedEvent(Long candidateId, String resumeUrl) {}
