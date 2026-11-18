/** Nhãn hiển thị cho độ tương đồng embedding (dùng chung ở Kho ứng viên, gợi ý theo tin, cột "Khớp JD"). */

// Ngưỡng khởi đầu, đo trên 12 CV thử: CV đúng vai trò thường 0,72–0,76, CV lệch vai trò ~0,69, câu hỏi ngoài lĩnh vực ~0,6.
// Điểm cosine chỉ có nghĩa TƯƠNG ĐỐI nên chỉ hiện nhãn, không hiện phần trăm. Cần hiệu chỉnh khi có nhiều dữ liệu hơn.
const SCORE_STRONG = 0.74;
const SCORE_GOOD = 0.7;

/**
 * Nhãn mức khớp. Có điều kiện để kiểm (kỹ năng, từ khoá) thì dựa vào BẰNG CHỨNG: CV chứng minh được bao nhiêu điều kiện.
 * Điểm ngữ nghĩa chỉ chặn nhãn cao khi hồ sơ lệch hẳn câu hỏi. Không có điều kiện (gợi ý theo tin) thì dùng điểm.
 */
export function matchLabel(score: number, coverage?: number | null): { text: string; color: string } {
    if (coverage != null && score >= SCORE_GOOD - 0.05) {
        if (coverage >= 1) return { text: "Rất khớp", color: "green" };
        if (coverage >= 0.5) return { text: "Khớp", color: "blue" };
        return { text: "Khớp một phần", color: "default" };
    }
    if (score >= SCORE_STRONG) return { text: "Rất khớp", color: "green" };
    if (score >= SCORE_GOOD) return { text: "Khớp", color: "blue" };
    return { text: "Liên quan thấp", color: "default" };
}

export const CHUNK_LABEL: Record<string, string> = {
    SUMMARY: "Tóm tắt", SKILLS: "Kỹ năng", WORK_EXPERIENCE: "Kinh nghiệm",
    PROJECT: "Dự án", EDUCATION: "Học vấn", CERTIFICATION: "Chứng chỉ",
};
