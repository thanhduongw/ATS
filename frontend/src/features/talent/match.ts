/** Nhãn hiển thị cho độ tương đồng embedding (dùng chung ở Kho ứng viên, gợi ý theo tin, cột "Khớp JD"). */

// Ngưỡng khởi đầu, đo trên 12 CV thử: CV đúng vai trò thường 0,72–0,76, CV lệch vai trò ~0,69, câu hỏi ngoài lĩnh vực ~0,6.
// Điểm cosine chỉ có nghĩa TƯƠNG ĐỐI nên chỉ hiện nhãn, không hiện phần trăm. Cần hiệu chỉnh khi có nhiều dữ liệu hơn.
const SCORE_STRONG = 0.74;
const SCORE_GOOD = 0.7;

export function matchLabel(score: number): { text: string; color: string } {
    if (score >= SCORE_STRONG) return { text: "Rất khớp", color: "green" };
    if (score >= SCORE_GOOD) return { text: "Khớp", color: "blue" };
    return { text: "Liên quan thấp", color: "default" };
}

export const CHUNK_LABEL: Record<string, string> = {
    SUMMARY: "Tóm tắt", SKILLS: "Kỹ năng", WORK_EXPERIENCE: "Kinh nghiệm",
    PROJECT: "Dự án", EDUCATION: "Học vấn", CERTIFICATION: "Chứng chỉ",
};
