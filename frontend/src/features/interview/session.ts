/**
 * Lô phỏng vấn — các buổi được tạo cùng một lần mang chung `sessionId`.
 *
 * Chỉ dùng để gom nhóm khi hiển thị. Trạng thái, đánh giá và vắng mặt vẫn độc lập
 * theo từng ứng viên.
 */

export interface SessionDisplay {
    size: number;
    accent: string;
}

const SESSION_ACCENTS = ["#2563EB", "#7C3AED", "#DB2777", "#0891B2", "#4F46E5", "#0F766E"];

/** Màu ổn định theo mã lô để cùng một lô luôn hiện cùng một màu giữa các lần tải. */
export function sessionAccent(sessionId: number): string {
    return SESSION_ACCENTS[Math.abs(Math.trunc(sessionId)) % SESSION_ACCENTS.length];
}

export function sessionDescription(sessionId: number, size: number): string {
    return `Lô ${size} ứng viên · Mã lô ${sessionId}. Mỗi buổi có trạng thái và thao tác riêng.`;
}
