package iuh.fit.se.offer.event;

/** Phát sau khi ứng viên nhận thư mời: tổng số thư mời đã nhận của tin. recruitment-service so với chỉ tiêu để đóng tin. */
public record PostingHiredCountEvent(Long jobPostingId, long acceptedCount) {}
