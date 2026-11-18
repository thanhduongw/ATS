package iuh.fit.se.offer.event;

/** Ứng viên đã xoá dữ liệu cá nhân của mình (candidate-service phát với khoá {@code candidate.data_deleted}). */
public record CandidateDataDeletedEvent(Long candidateId, Long userId) {}
