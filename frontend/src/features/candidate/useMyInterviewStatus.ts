import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { getEvaluationsByApplications, getInterviews } from "../interview/interviewApi";
import type { InterviewResponse, RecommendationType } from "../interview/types";
import type { StatusTone } from "../../app/theme";

/**
 * H08 · cột "Phỏng vấn của bạn" — trạng thái buổi phỏng vấn mà người đang xem được phân công:
 * "Cần nộp đánh giá", "Đã nộp · Nên tuyển", "PV hôm nay 16:00", "PV 29/10 · chờ bạn xác nhận",
 * "PV 30/10 · đã đề xuất đổi giờ". Không được phân công thì không có giá trị.
 */
export interface MyInterviewStatus { text: string; tone: StatusTone | null }

const REC_SHORT: Record<RecommendationType, string> = {
    STRONG_YES: "Rất nên tuyển", YES: "Nên tuyển", NO: "Không nên tuyển", STRONG_NO: "Không tuyển",
};

export function useMyInterviewStatus(enabled: boolean, myId: number | null, applicationIds: number[]) {
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [recs, setRecs] = useState<Map<number, RecommendationType | null>>(new Map());

    useEffect(() => {
        if (!enabled) return;
        getInterviews().then((r) => setInterviews(r.data)).catch(() => setInterviews([]));
    }, [enabled]);

    /** applicationId → buổi gần nhất (không tính buổi đã huỷ) mà mình là người phỏng vấn. */
    const mine = useMemo(() => {
        const m = new Map<number, InterviewResponse>();
        if (myId == null) return m;
        interviews
            .filter((iv) => iv.status !== "CANCELLED" && iv.interviewers.some((p) => p.interviewerId === myId))
            .forEach((iv) => {
                const cur = m.get(iv.applicationId);
                if (!cur || dayjs(iv.scheduledAt).isAfter(cur.scheduledAt)) m.set(iv.applicationId, iv);
            });
        return m;
    }, [interviews, myId]);

    const submittedKey = applicationIds
        .filter((id) => mine.get(id)?.interviewers.find((p) => p.interviewerId === myId)?.evaluationSubmitted)
        .join(",");

    useEffect(() => {
        if (!enabled || !submittedKey) return;
        getEvaluationsByApplications(submittedKey.split(",").map(Number)).then((r) => {
            const m = new Map<number, RecommendationType | null>();
            r.data.forEach((a) => {
                const e = a.evaluations.find((x) => x.interviewerId === myId && x.submittedAt);
                m.set(a.applicationId, e?.overallRecommendation ?? null);
            });
            setRecs(m);
        }).catch(() => undefined);
    }, [enabled, submittedKey, myId]);

    return (applicationId: number): MyInterviewStatus | null => {
        const iv = mine.get(applicationId);
        if (!iv) return null;
        const me = iv.interviewers.find((p) => p.interviewerId === myId);
        const at = dayjs(iv.scheduledAt);
        const now = dayjs();
        if (me?.evaluationSubmitted) {
            const rec = recs.get(applicationId);
            return { text: rec ? `Đã nộp · ${REC_SHORT[rec]}` : "Đã nộp đánh giá", tone: "success" };
        }
        if (at.add(iv.durationMinutes ?? 60, "minute").isBefore(now)) return { text: "Cần nộp đánh giá", tone: "warning" };
        const when = at.isSame(now, "day") ? `PV hôm nay ${at.format("HH:mm")}` : `PV ${at.format("DD/MM")}`;
        if (iv.status === "HM_RESCHEDULE_PROPOSED") return { text: `${when} · đã đề xuất đổi giờ`, tone: "interview" };
        if (!iv.hmConfirmed) return { text: `${when} · chờ bạn xác nhận`, tone: "warning" };
        return { text: at.isSame(now, "day") ? when : `${when} ${at.format("HH:mm")}`, tone: null };
    };
}
