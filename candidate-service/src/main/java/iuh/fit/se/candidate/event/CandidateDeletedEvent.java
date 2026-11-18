package iuh.fit.se.candidate.event;

/** Ứng viên bị xóa (mềm) — ai-service xóa embedding và dữ liệu trích xuất của ứng viên này. */
public record CandidateDeletedEvent(Long candidateId) {}
