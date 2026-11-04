import { useEffect, useState } from "react";
import { Spin } from "antd";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { getInterviews } from "../../interview/interviewApi";
import type { InterviewResponse } from "../../interview/types";
import type { ApplicationResponse } from "../../candidate/types";
import { POSTING_STATUS_VIEW } from "../../recruitment/postingLabels";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, FIXED_STAGES, STAGE_COLORS, type FixedStage } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { fullDate } from "../../../app/datetime";
import { Avatar, InlineNotice, Panel } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import StageTag from "../../../components/ui/StageTag";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import { offerStatusText, useDepartmentResults } from "../useDepartmentResults";

/**
 * H17 · Kết quả một vị trí: phễu tuyển dụng + ứng viên đã đến vòng phỏng vấn.
 * Phễu đếm theo giai đoạn hiện tại: hồ sơ ở giai đoạn sau được tính là đã đi qua các giai đoạn trước.
 * Hồ sơ bị từ chối chỉ tính ở "Ứng tuyển" (không biết bị loại ở vòng nào). Chưa có hạn nộp (tin chưa có trường này).
 */
const MAIN: FixedStage[] = FIXED_STAGES.filter((s) => s !== "REJECTED");

export default function PositionResultPage() {
    const { id } = useParams();
    const postingId = Number(id);
    const navigate = useNavigate();
    const myId = useAppSelector((s) => (s.auth.user?.userId ? Number(s.auth.user.userId) : null));
    const { loading, postings, appsByPosting, offerByApp } = useDepartmentResults();
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);

    useEffect(() => {
        getInterviews().then((r) => setInterviews(r.data.filter((iv) => iv.jobPostingId === postingId && iv.status !== "CANCELLED")))
            .catch(() => setInterviews([]));
    }, [postingId]);

    if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spin /></div>;
    const posting = postings.find((p) => p.id === postingId);
    if (!posting) return <InlineNotice tone="danger">Không tìm thấy vị trí này trong phòng của bạn.</InlineNotice>;

    const apps = appsByPosting.get(postingId) ?? [];
    const rank = (a: ApplicationResponse) => MAIN.indexOf(toFixedStage(a.currentStageType));
    const funnel = MAIN.map((s, i) => ({ s, n: i === 0 ? apps.length : apps.filter((a) => rank(a) >= i).length }));
    const hired = funnel[funnel.length - 1].n;
    const ivByApp = new Map<number, InterviewResponse[]>();
    interviews.forEach((iv) => ivByApp.set(iv.applicationId, [...(ivByApp.get(iv.applicationId) ?? []), iv]));
    const reached = apps.filter((a) => rank(a) >= MAIN.indexOf("INTERVIEW") || ivByApp.has(a.id))
        .sort((a, b) => rank(b) - rank(a));

    const lineOf = (a: ApplicationResponse) => {
        const ivs = (ivByApp.get(a.id) ?? []).sort((x, y) => dayjs(y.scheduledAt).valueOf() - dayjs(x.scheduledAt).valueOf());
        const iv = ivs[0];
        if (!iv) return "Chưa có lịch phỏng vấn";
        const at = dayjs(iv.scheduledAt);
        if (at.add(iv.durationMinutes ?? 60, "minute").isAfter(dayjs())) {
            return at.isSame(dayjs(), "day") ? `Phỏng vấn hôm nay ${at.format("HH:mm")}` : `Phỏng vấn ${at.format("DD/MM HH:mm")}`;
        }
        const total = iv.interviewers.length;
        const done = iv.interviewers.filter((p) => p.evaluationSubmitted).length;
        const meLeft = iv.interviewers.some((p) => p.interviewerId === myId && !p.evaluationSubmitted);
        return done === total ? `${total} đánh giá` : `${done}/${total} đánh giá${meLeft ? " · còn bạn" : ""}`;
    };

    const max = Math.max(1, funnel[0].n);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1080 }}>
            <div>
                <PageBreadcrumb crumb={posting.title} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>{posting.title}</span>
                    <StatusTag {...POSTING_STATUS_VIEW[posting.status]} />
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
                    {[`Đã tuyển ${hired}/${posting.headcount ?? "?"}`,
                        posting.publishedAt ? `Ngày mở tuyển ${fullDate(posting.publishedAt)}` : null,
                        posting.publishedAt ? `Đã mở ${dayjs().diff(dayjs(posting.publishedAt), "day")} ngày` : null]
                        .filter(Boolean).join(" · ")}
                </div>
            </div>

            <Panel title="Phễu tuyển dụng" subtitle="Số ứng viên đã đi tới từng giai đoạn" bodyGap={10}>
                {funnel.map(({ s, n }) => (
                    <div key={s} style={{ display: "grid", gridTemplateColumns: "100px 1fr 40px", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 13 }}>{FIXED_STAGE_LABEL[s]}</span>
                        <div style={{ height: 10, borderRadius: 5, background: COLORS.fill }}>
                            <div style={{ width: `${(n / max) * 100}%`, height: "100%", borderRadius: 5, background: STAGE_COLORS[s].color }} />
                        </div>
                        <b style={{ textAlign: "right" }}>{n}</b>
                    </div>
                ))}
            </Panel>

            <Panel title="Ứng viên đã đến vòng phỏng vấn" bodyGap={0}>
                {reached.length === 0 ? (
                    <span style={{ color: COLORS.textSecondary }}>Chưa có ứng viên nào tới vòng phỏng vấn.</span>
                ) : reached.map((a) => {
                    const offer = offerStatusText(offerByApp.get(a.id));
                    return (
                        <div
                            key={a.id}
                            className="row-clickable"
                            onClick={() => navigate(`/candidates/${a.candidateId}/applications/${a.id}`)}
                            style={{
                                display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer",
                                borderTop: `0.5px solid ${COLORS.border}`,
                            }}
                        >
                            <Avatar name={a.candidateName} colorKey={a.candidateId} size={32} />
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <span style={{ fontWeight: 600 }}>{a.candidateName}</span>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{lineOf(a)}</span>
                            </div>
                            {offer ? <StatusTag tone="success" label={offer} /> : <StageTag stageType={a.currentStageType} />}
                        </div>
                    );
                })}
            </Panel>
        </div>
    );
}
