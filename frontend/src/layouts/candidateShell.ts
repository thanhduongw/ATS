import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

/** Khung ứng viên truyền xuống trang con qua <Outlet context>. */
export interface CandidateShellContext {
    /** true → ẩn thẻ menu trái, trang con tự trải hết chiều ngang (C23 chào mừng gia nhập). */
    setBare: (bare: boolean) => void;
    /** Tải lại số việc cần phản hồi trên menu (sau khi đồng ý lịch / trả lời thư mời). */
    refreshBadges: () => void;
}

/** Khung ứng viên của trang hiện tại; undefined nếu trang không nằm trong khung ứng viên. */
export function useCandidateShell() {
    return useOutletContext<CandidateShellContext | undefined>();
}

/** Trang con gọi khi cần hiển thị toàn màn như HTML (chỉ header website, không menu trái). */
export function useBareCandidatePage(on: boolean) {
    const ctx = useCandidateShell();
    useEffect(() => {
        if (!ctx || !on) return;
        ctx.setBare(true);
        return () => ctx.setBare(false);
    }, [ctx, on]);
}
