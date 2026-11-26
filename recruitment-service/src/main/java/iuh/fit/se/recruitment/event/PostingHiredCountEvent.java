package iuh.fit.se.recruitment.event;

/** Khớp field JSON với event cùng tên bên offer-service. */
public record PostingHiredCountEvent(Long jobPostingId, long acceptedCount) {}
