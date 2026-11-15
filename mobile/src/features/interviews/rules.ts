import type { CandidateInterview } from "@/types/api";

/**
 * Buổi đang chờ ứng viên Đồng ý / Từ chối: phòng ban đã chốt giờ (HM_CONFIRMED) VÀ chưa tới giờ.
 * Buổi HM_CONFIRMED đã qua giờ không trả lời được nữa — không đếm vào số trên tab, không hiện thẻ "Đồng ý"
 * (cùng quy tắc `needsConfirm` của web: frontend/src/features/candidate/useCandidatePortal.ts).
 */
export const awaitsReply = (iv: CandidateInterview, now: number) =>
  iv.status === "HM_CONFIRMED" && new Date(iv.scheduledAt ?? 0).getTime() > now;
