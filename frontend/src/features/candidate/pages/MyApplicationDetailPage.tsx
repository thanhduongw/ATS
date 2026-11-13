import { useState } from "react";
import { App, Button, Spin } from "antd";
import { ArrowRightOutlined, CalendarOutlined, CheckOutlined, LeftOutlined, MailOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { withdrawMyApplication } from "../applicationApi";
import type { ApiMessageResponse, CandidateApplicationResponse } from "../types";
import type { CandidateInterviewResponse } from "../../interview/types";
import { COLORS, FIXED_STAGES, RADIUS, type FixedStage } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { InlineNotice, Panel, SmallDialog } from "../../../components/ui/designKit";
import CandidateStageTag from "../components/CandidateStageTag";
import { canWithdraw, closedLabel, needsConfirm, todoOf, useCandidatePortal } from "../useCandidatePortal";

/**
 * C12 · Chi tiết đơn — "‹ Đơn ứng tuyển", thẻ đầu (giai đoạn, vị trí, ngày nộp, "Xem tin tuyển dụng"), việc cần làm
 * nổi bật (khung cam), tiến trình 5 bước nối dọc một màu xanh chính như HTML; nút "Rút đơn ứng tuyển" (UC06, B5).
 * Khác HTML: chưa hiện tên file CV đã nộp và người phụ trách (API phía ứng viên chưa trả về).
 */
const STEPS: FixedStage[] = FIXED_STAGES.filter((s) => s !== "REJECTED");

export default function MyApplicationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const { loading, failed, applications, interviews, offers, reload } = useCandidatePortal();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    if (failed) {
        return <InlineNotice tone="danger" action={<Button onClick={reload}>Thử lại</Button>}>Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.</InlineNotice>;
    }
    const app = applications.find((a) => String(a.id) === id);
    if (!app) {
        return <InlineNotice tone="danger" action={<Button onClick={() => navigate("/my-applications")}>Về danh sách</Button>}>Không tìm thấy đơn ứng tuyển này.</InlineNotice>;
    }

    const ivs = interviews.filter((iv) => iv.applicationId === app.id && iv.status !== "CANCELLED")
        .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf());
    const offer = offers.filter((o) => o.applicationId === app.id).sort((a, b) => b.id - a.id)[0];
    const todo = todoOf(app, interviews, offers);
    const closed = closedLabel(app);

    const withdraw = async () => {
        setBusy(true);
        try {
            await withdrawMyApplication(app.id);
            message.success("Đã rút đơn ứng tuyển");
            setConfirmOpen(false);
            reload();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không rút được đơn, vui lòng thử lại");
        } finally { setBusy(false); }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button
                type="button"
                onClick={() => navigate("/my-applications")}
                style={{
                    alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, border: 0, padding: 0,
                    background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: COLORS.textSecondary,
                }}
            >
                <LeftOutlined style={{ fontSize: 11 }} /> Đơn ứng tuyển
            </button>

            <Panel>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
                        <CandidateStageTag app={app} />
                        <span style={{ fontSize: 22, fontWeight: 700 }}>{app.jobTitle ?? `Đơn #${app.id}`}</span>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            {[app.departmentName, `Nộp ngày ${dayjs(app.appliedAt).format("DD/MM/YYYY")}`].filter(Boolean).join(" · ")}
                        </span>
                    </div>
                    <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/careers/jobs/${app.jobPostingId}`)}>Xem tin tuyển dụng</Button>
                </div>
            </Panel>

            {todo && (
                <section style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: RADIUS.lg,
                    background: COLORS.cardBg, boxShadow: `inset 0 0 0 1.5px ${COLORS.warningBg}`,
                }}>
                    <span style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: COLORS.warningBg, color: COLORS.warning,
                        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>
                        {todo.to.startsWith("/my-offers") ? <MailOutlined /> : <CalendarOutlined />}
                    </span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{todo.text}</span>
                    <Button type="primary" onClick={() => navigate(todo.to)}>{todo.actionLabel}</Button>
                </section>
            )}
            {closed && (
                <InlineNotice tone="neutral">
                    {closed.label === "Đã rút đơn"
                        ? "Bạn đã rút đơn này. Cảm ơn bạn đã quan tâm."
                        : "Đơn này đã đóng. Cảm ơn bạn đã quan tâm — hãy xem thêm các việc làm khác phù hợp với bạn."}
                </InlineNotice>
            )}

            <div className="cand-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                <Panel title="Tiến trình" bodyGap={14}>
                    <div>
                    {STEPS.map((s, i) => (
                        <Step
                            key={s} index={i} stage={s} state={stepState(app, i)} detail={stepDetail(app, s, ivs, offer?.status)}
                            last={i === STEPS.length - 1} nextReached={i < STEPS.length - 1 && stepState(app, i + 1) !== "todo"}
                        />
                    ))}
                    </div>
                </Panel>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Panel title="Hồ sơ đã nộp">
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            Ngày nộp {dayjs(app.appliedAt).format("DD/MM/YYYY · HH:mm")}
                        </span>
                        <Button style={{ alignSelf: "flex-start" }} onClick={() => navigate("/my-profile")}>Xem hồ sơ của tôi</Button>
                    </Panel>
                    {canWithdraw(app) && (
                        <Panel title="Rút đơn">
                            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                Không muốn tiếp tục với vị trí này? Bạn có thể rút đơn bất cứ lúc nào trước khi nhận việc.
                            </span>
                            <Button danger style={{ alignSelf: "flex-start" }} onClick={() => setConfirmOpen(true)}>Rút đơn ứng tuyển</Button>
                        </Panel>
                    )}
                </div>
            </div>

            <SmallDialog
                open={confirmOpen}
                title="Rút đơn ứng tuyển?"
                subtitle={app.jobTitle ?? undefined}
                okText="Rút đơn"
                danger
                okLoading={busy}
                onCancel={() => setConfirmOpen(false)}
                onOk={withdraw}
            >
                <span style={{ color: COLORS.textSecondary }}>
                    Đơn sẽ kết thúc và các buổi phỏng vấn chưa diễn ra sẽ bị huỷ. Không hoàn tác được.
                </span>
            </SmallDialog>
        </div>
    );
}

type StepState = "done" | "current" | "todo";

function stepState(app: CandidateApplicationResponse, i: number): StepState {
    const stage = toFixedStage(app.currentStageType);
    // Đơn đã đóng: không biết dừng ở vòng nào → chỉ đánh dấu bước "Ứng tuyển".
    if (stage === "REJECTED") return i === 0 ? "done" : "todo";
    const rank = STEPS.indexOf(stage);
    if (stage === "HIRED" || i < rank) return "done";
    return i === rank ? "current" : "todo";
}

function stepDetail(
    app: CandidateApplicationResponse, s: FixedStage, ivs: CandidateInterviewResponse[], offerStatus?: string,
): string | null {
    const stage = toFixedStage(app.currentStageType);
    if (s === "APPLIED") return dayjs(app.appliedAt).format("DD/MM · HH:mm");
    if (s === "HIRED") return app.hiredAt ? `Nhận việc ${dayjs(app.hiredAt).format("DD/MM/YYYY")}` : null;
    if (s !== stage) return null;
    if (s === "SCREENING") return "Đang xem hồ sơ của bạn";
    if (s === "INTERVIEW") {
        const pending = ivs.find(needsConfirm);
        if (pending) return `Chờ bạn trả lời lịch ${dayjs(pending.scheduledAt).format("DD/MM HH:mm")}`;
        const live = ivs.filter((iv) => iv.status !== "CANCELLED")
            .sort((a, b) => dayjs(b.scheduledAt).valueOf() - dayjs(a.scheduledAt).valueOf())[0];
        if (live?.status === "CANDIDATE_DECLINED") return "Bạn đã xin dời lịch · chờ lịch mới";
        const next = ivs.find((iv) => dayjs(iv.scheduledAt).isAfter(dayjs()));
        return next ? `Phỏng vấn ${dayjs(next.scheduledAt).format("DD/MM HH:mm")}` : "Đang chờ kết quả";
    }
    if (s === "OFFER") {
        if (offerStatus === "APPROVED") return "Chờ bạn phản hồi thư mời";
        if (offerStatus === "ACCEPTED") return "Bạn đã nhận lời";
        return "Đang chuẩn bị thư mời";
    }
    return null;
}

/** Một bước: đã qua = tròn xanh có ✓, đang ở = viền xanh có chấm, chưa tới = số xám; đường nối xanh tới bước đã tới. */
function Step({ index, stage, state, detail, last, nextReached }: {
    index: number; stage: FixedStage; state: StepState; detail: string | null; last: boolean; nextReached: boolean;
}) {
    const circle = state === "done"
        ? { background: COLORS.primary, color: COLORS.textOnDark, boxShadow: "none" }
        : state === "current"
            ? { background: COLORS.cardBg, color: COLORS.primary, boxShadow: `inset 0 0 0 2px ${COLORS.primary}` }
            : { background: COLORS.fill, color: COLORS.textMuted, boxShadow: "none" };
    // Việc đang chờ chính ứng viên ("Chờ bạn …") tô cam như HTML; còn lại chữ phụ.
    const waitingMe = state === "current" && !!detail && /^Chờ bạn/.test(detail);
    return (
        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
                <span style={{
                    width: 28, height: 28, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, ...circle,
                }}>
                    {state === "done" ? <CheckOutlined /> : state === "current"
                        ? <span style={{ width: 10, height: 10, borderRadius: 5, background: COLORS.primary }} />
                        : index + 1}
                </span>
                {!last && <span style={{ flex: 1, width: 2, minHeight: 28, background: nextReached ? COLORS.primary : COLORS.border }} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingTop: 3, paddingBottom: last ? 0 : 18 }}>
                <span style={{ fontWeight: state === "todo" ? 500 : 600, color: state === "todo" ? COLORS.textSecondary : COLORS.textPrimary }}>
                    {FIXED_STAGE_LABEL[stage]}
                </span>
                {detail && <span style={{ fontSize: 12, color: waitingMe ? COLORS.warning : COLORS.textSecondary }}>{detail}</span>}
            </div>
        </div>
    );
}
