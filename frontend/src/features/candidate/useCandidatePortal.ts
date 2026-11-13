import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { getMyApplications } from "./applicationApi";
import type { CandidateApplicationResponse } from "./types";
import { getMyInterviews } from "../interview/interviewApi";
import type { CandidateInterviewResponse } from "../interview/types";
import { getMyOffers } from "../offer/offerCandidateApi";
import type { CandidateOfferResponse } from "../offer/types";
import { toFixedStage } from "../../app/stages";
import type { StatusTone } from "../../app/theme";

/**
 * Dữ liệu chung của cổng ứng viên (C20 Tổng quan, C11/C12 Đơn ứng tuyển):
 * đơn + lịch phỏng vấn + thư mời của chính ứng viên, kèm "việc cần làm" của từng đơn.
 */
export interface CandidatePortal {
    loading: boolean;
    /** true khi KHÔNG tải được đơn — màn hình phải báo lỗi chứ không hiện "0" / trống (C33). */
    failed: boolean;
    applications: CandidateApplicationResponse[];
    interviews: CandidateInterviewResponse[];
    offers: CandidateOfferResponse[];
    reload: () => void;
}

/** `refreshKey` đổi → tải lại (khung ứng viên truyền đường dẫn hiện tại để số trên menu luôn mới). */
export function useCandidatePortal(refreshKey?: string): CandidatePortal {
    const [state, setState] = useState<Omit<CandidatePortal, "reload">>({
        loading: true, failed: false, applications: [], interviews: [], offers: [],
    });
    const [tick, setTick] = useState(0);
    const reload = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getMyApplications(),
            getMyInterviews().catch(() => null),
            getMyOffers().catch(() => null),
        ]).then(([a, i, o]) => {
            if (cancelled) return;
            setState({
                loading: false, failed: false,
                applications: [...a.data].sort((x, y) => dayjs(y.appliedAt).valueOf() - dayjs(x.appliedAt).valueOf()),
                interviews: i?.data ?? [],
                offers: o?.data ?? [],
            });
        }).catch(() => { if (!cancelled) setState((s) => ({ ...s, loading: false, failed: true })); });
        return () => { cancelled = true; };
    }, [tick, refreshKey]);

    return { ...state, reload };
}

/* ── Việc cần làm của một đơn ─────────────────────────────────── */

export interface CandidateTodo {
    /** "Xác nhận lịch phỏng vấn", "Phản hồi thư mời trước 30/10". */
    text: string;
    actionLabel: string;
    to: string;
    /** Hạn hoặc thời điểm để sắp xếp (sớm nhất lên trước). */
    due: string | null;
}

/**
 * Buổi phỏng vấn sắp tới chờ ứng viên Đồng ý / Từ chối. Backend chỉ cho trả lời khi phòng ban đã chốt giờ
 * (HM_CONFIRMED — InterviewService.confirmByCandidate); SCHEDULED nghĩa là đang chờ phòng ban.
 * Lịch là 1 giờ cố định (04/11/2026): ứng viên không chọn khung giờ, không tự đề xuất giờ.
 */
export const needsConfirm = (iv: CandidateInterviewResponse) =>
    iv.status === "HM_CONFIRMED" && dayjs(iv.scheduledAt).isAfter(dayjs());

/** Ứng viên còn từ chối (xin dời / rút đơn) được: lịch đã chốt, kể cả đã đồng ý, và chưa tới giờ. */
export const canDecline = (iv: CandidateInterviewResponse) =>
    (iv.status === "HM_CONFIRMED" || iv.status === "CANDIDATE_CONFIRMED") && dayjs(iv.scheduledAt).isAfter(dayjs());

/** Thư mời đã gửi, đang chờ ứng viên phản hồi. */
export const awaitingReply = (o: CandidateOfferResponse) =>
    o.status === "APPROVED" && (!o.responseDeadline || dayjs(o.responseDeadline).endOf("day").isAfter(dayjs()));

export function todoOf(
    app: CandidateApplicationResponse, interviews: CandidateInterviewResponse[], offers: CandidateOfferResponse[],
): CandidateTodo | null {
    const offer = offers.filter((o) => o.applicationId === app.id && awaitingReply(o)).sort((a, b) => b.id - a.id)[0];
    if (offer) {
        return {
            text: offer.responseDeadline ? `Phản hồi thư mời trước ${dayjs(offer.responseDeadline).format("DD/MM")}` : "Phản hồi thư mời nhận việc",
            actionLabel: "Xem thư mời",
            to: `/my-offers/${offer.id}`,
            due: offer.responseDeadline,
        };
    }
    const iv = interviews.filter((x) => x.applicationId === app.id && needsConfirm(x))
        .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf())[0];
    if (iv) {
        return {
            text: `Trả lời lịch phỏng vấn ${dayjs(iv.scheduledAt).format("DD/MM HH:mm")}`,
            actionLabel: "Trả lời",
            to: "/my-interviews",
            due: iv.scheduledAt,
        };
    }
    return null;
}

/* ── Nhóm tab C11 và nhãn giai đoạn phía ứng viên ─────────────── */

export type AppGroup = "ACTIVE" | "OFFER" | "CLOSED";

export function groupOf(app: CandidateApplicationResponse): AppGroup {
    const s = toFixedStage(app.currentStageType);
    if (s === "OFFER") return "OFFER";
    if (s === "REJECTED" || s === "HIRED") return "CLOSED";
    return "ACTIVE";
}

/** Đơn đã rút (lý do do hệ thống gắn khi ứng viên tự rút — ApplicationService.WITHDRAW_REASON_NAME). */
export const isWithdrawn = (app: CandidateApplicationResponse) =>
    toFixedStage(app.currentStageType) === "REJECTED" && (app.rejectionReasonName ?? "").toLowerCase().includes("tự rút");

/** Nhãn đóng của đơn: ứng viên không thấy chữ "Từ chối" (DS06) — dùng "Chưa phù hợp" / "Đã rút đơn". */
export function closedLabel(app: CandidateApplicationResponse): { label: string; tone: StatusTone } | null {
    if (toFixedStage(app.currentStageType) !== "REJECTED") return null;
    return isWithdrawn(app) ? { label: "Đã rút đơn", tone: "neutral" } : { label: "Chưa phù hợp", tone: "neutral" };
}

export const canWithdraw = (app: CandidateApplicationResponse) =>
    !["HIRED", "REJECTED"].includes(toFixedStage(app.currentStageType));
