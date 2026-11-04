package iuh.fit.se.application.application.dto;

/**
 * Thống kê số hồ sơ theo xếp loại AI, trong cùng phạm vi bộ lọc của danh sách hồ sơ.
 *
 * @param total        tổng số hồ sơ khớp bộ lọc (= fit + notFit + unclassified + unscored)
 * @param fit          xếp loại FIT (Phù hợp)
 * @param notFit       xếp loại NOT_FIT (Không phù hợp)
 * @param unclassified xếp loại UNCLASSIFIED (Chưa phân loại)
 * @param unscored     chưa có xếp loại: chưa chấm, đang chấm lần đầu hoặc chấm lỗi
 */
public record AiTierStatsResponse(long total, long fit, long notFit, long unclassified, long unscored) {}
