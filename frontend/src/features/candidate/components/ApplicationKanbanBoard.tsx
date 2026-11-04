import { useEffect, useState } from "react";
import { App, Button, Checkbox, Input, Select } from "antd";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import type { PipelineStageResponse } from "../../masterdata/types";
import type { ApiMessageResponse, ApplicationResponse } from "../types";
import type { InterviewResponse } from "../../interview/types";
import type { OfferResponse } from "../../offer/types";
import RejectApplicationModal from "./RejectApplicationModal";
import { useTrailNavigate } from "../../../app/useNavTrail";
import { COLORS, FIXED_STAGES, STAGE_COLORS, type FixedStage } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { advanceSteps, stepsToFixedStage } from "../stageAdvance";
import { AiScorePill, Avatar, SmallDialog } from "../../../components/ui/designKit";
import { bulkAssignApplicationRecruiter, bulkRejectApplications } from "../applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { getUserDirectory } from "../../auth/authApi";
import type { UserDirectoryResponse } from "../../auth/types";

/**
 * R09 · Trang việc làm — ứng viên theo giai đoạn.
 * 5 cột chính (Ứng tuyển → Đã tuyển), dải "Kéo vào đây để từ chối" ở dưới.
 * Mỗi cột hiện tối đa 4 thẻ, còn lại gom thành "+ N ứng viên khác" (bấm để mở hết).
 * Chỉ được kéo sang giai đoạn kế tiếp (API chỉ cho đi tới) hoặc sang Từ chối.
 * R10/R15/R42 · Chọn nhiều: ô chọn trên thẻ → thanh "Đã chọn N · So sánh · Chuyển giai đoạn ·
 * Giao người phụ trách · Từ chối" (từ chối hàng loạt kèm lý do, ứng viên nhận email thông báo).
 */
interface Props {
    applications: ApplicationResponse[];
    stages: PipelineStageResponse[];
    interviews: InterviewResponse[];
    offers: OfferResponse[];
    canManage: boolean;
    onChanged: () => void;
    /** R42: mở so sánh với các hồ sơ đã chọn. */
    onCompare?: (applicationIds: number[]) => void;
}

const MAIN = FIXED_STAGES.filter((s) => s !== "REJECTED");
const PREVIEW = 4;

function cardLine(app: ApplicationResponse, stage: FixedStage, iv: InterviewResponse | undefined, offer: OfferResponse | undefined) {
    const now = dayjs();
    if (stage === "INTERVIEW" && iv) {
        const at = dayjs(iv.scheduledAt);
        const when = at.isSame(now, "day") ? `PV hôm nay ${at.format("HH:mm")}` : `PV ${at.format("DD/MM HH:mm")}`;
        const ended = at.add(iv.durationMinutes ?? 60, "minute").isBefore(now);
        const done = iv.interviewers.filter((p) => p.evaluationSubmitted).length;
        const badge = ended && done < iv.interviewers.length ? `Chờ đánh giá ${done}/${iv.interviewers.length}`
            : iv.status === "SCHEDULED" || iv.status === "HM_CONFIRMED" ? "Chờ xác nhận"
                : iv.status === "HM_RESCHEDULE_PROPOSED" ? "Đề xuất đổi giờ"
                    : iv.status === "CANDIDATE_DECLINED" ? "Ứng viên xin dời" : null;
        return { text: when, badge };
    }
    if (stage === "INTERVIEW") return { text: "Chưa có lịch phỏng vấn", badge: "Cần lên lịch" };
    if (stage === "OFFER") {
        if (!offer) return { text: "Chưa soạn thư mời", badge: null };
        const label = offer.status === "DRAFT" ? "Thư mời nháp" : offer.status === "APPROVED" ? "Đã gửi thư mời"
            : offer.status === "ACCEPTED" ? "Ứng viên đã nhận" : "Thư mời";
        return { text: label, badge: offer.status === "DRAFT" ? "Chưa gửi" : null };
    }
    const days = now.diff(dayjs(app.appliedAt), "day");
    return {
        text: `Ứng tuyển ${dayjs(app.appliedAt).format("DD/MM")}`,
        badge: stage === "APPLIED" && days >= 2 ? `${days} ngày chưa xem` : stage === "SCREENING" && days >= 2 ? `${days} ngày` : null,
    };
}

export default function ApplicationKanbanBoard({ applications, stages, interviews, offers, canManage, onChanged, onCompare }: Props) {
    const { message } = App.useApp();
    const openApplication = useTrailNavigate();
    const [expanded, setExpanded] = useState<Set<FixedStage>>(new Set());
    const [over, setOver] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [bulk, setBulk] = useState<null | "reject" | "assign">(null);
    const [reasons, setReasons] = useState<CatalogItem[]>([]);
    const [recruiters, setRecruiters] = useState<UserDirectoryResponse[]>([]);
    const [reasonId, setReasonId] = useState<number | undefined>();
    const [rejectNote, setRejectNote] = useState("");
    const [assignee, setAssignee] = useState<number | undefined>();
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!canManage) return;
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setReasons(r.data.filter((x) => x.active))).catch(() => undefined);
        getUserDirectory("RECRUITER").then((r) => setRecruiters(r.data)).catch(() => undefined);
    }, [canManage]);

    // Bỏ qua những hồ sơ không còn trên bảng (vd. vừa bị từ chối).
    const liveIds = new Set(applications.filter((a) => toFixedStage(a.currentStageType) !== "REJECTED").map((a) => a.id));
    const chosen = [...selected].filter((id) => liveIds.has(id));
    const chosenApps = applications.filter((a) => chosen.includes(a.id));
    const toggle = (id: number) => setSelected((cur) => {
        const n = new Set(cur);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });
    const sameStage = chosenApps.length > 0
        && chosenApps.every((a) => toFixedStage(a.currentStageType) === toFixedStage(chosenApps[0].currentStageType));
    const nextStage = sameStage ? MAIN[MAIN.indexOf(toFixedStage(chosenApps[0].currentStageType) as (typeof MAIN)[number]) + 1] : undefined;

    const report = (ok: number, failed: Record<number, string>, verb: string) => {
        const fails = Object.values(failed);
        if (ok) message.success(`Đã ${verb} ${ok} ứng viên`);
        if (fails.length) message.warning(`${fails.length} ứng viên chưa ${verb} được: ${fails[0]}`);
    };

    const advanceSelected = async () => {
        if (!nextStage) return;
        setBusy(true);
        let ok = 0;
        const failed: Record<number, string> = {};
        for (const a of chosenApps) {
            const steps = stepsToFixedStage(stages, a.currentStageId, nextStage);
            try {
                if (!steps) throw new Error("Không chuyển được sang giai đoạn kế tiếp");
                await advanceSteps(a.id, steps);
                ok += 1;
            } catch (err) {
                failed[a.id] = (err as AxiosError<ApiMessageResponse>).response?.data?.message ?? (err as Error).message;
            }
        }
        setBusy(false);
        report(ok, failed, `chuyển sang ${FIXED_STAGE_LABEL[nextStage]}`);
        setSelected(new Set());
        onChanged();
    };

    const rejectSelected = async () => {
        if (!reasonId) return;
        setBusy(true);
        try {
            const r = await bulkRejectApplications(chosen, reasonId, rejectNote.trim() || undefined);
            report(r.data.succeededIds.length, r.data.failedIds, "từ chối");
            setBulk(null);
            setSelected(new Set());
            onChanged();
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Từ chối thất bại");
        } finally { setBusy(false); }
    };

    const assignSelected = async () => {
        if (!assignee) return;
        setBusy(true);
        try {
            const r = await bulkAssignApplicationRecruiter(chosen, assignee);
            report(r.data.succeededIds.length, r.data.failedIds, "giao người phụ trách cho");
            setBulk(null);
            setSelected(new Set());
            onChanged();
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Giao người phụ trách thất bại");
        } finally { setBusy(false); }
    };

    const latestInterview = new Map<number, InterviewResponse>();
    interviews.filter((iv) => iv.status !== "CANCELLED").forEach((iv) => {
        const cur = latestInterview.get(iv.applicationId);
        if (!cur || dayjs(iv.scheduledAt).isAfter(cur.scheduledAt)) latestInterview.set(iv.applicationId, iv);
    });
    const latestOffer = new Map<number, OfferResponse>();
    offers.forEach((o) => {
        const cur = latestOffer.get(o.applicationId);
        if (!cur || o.id > cur.id) latestOffer.set(o.applicationId, o);
    });

    const byStage = (s: FixedStage) => applications
        .filter((a) => toFixedStage(a.currentStageType) === s)
        .sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
    const rejectedCount = byStage("REJECTED").length;

    const handleDragEnd = async (result: DropResult) => {
        setOver(null);
        if (!result.destination) return;
        const id = Number(result.draggableId);
        const source = result.source.droppableId as FixedStage;
        const dest = result.destination.droppableId as FixedStage;
        if (source === dest) return;
        if (dest === "REJECTED") { setRejectId(id); return; }
        const app = applications.find((a) => a.id === id);
        const steps = app ? stepsToFixedStage(stages, app.currentStageId, dest) : null;
        if (!steps) {
            message.warning("Chỉ chuyển được sang giai đoạn kế tiếp, hoặc kéo xuống dải Từ chối");
            return;
        }
        try {
            await advanceSteps(id, steps);
            message.success(`Đã chuyển ${app?.candidateName} sang ${FIXED_STAGE_LABEL[dest]}`);
            onChanged();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Chuyển giai đoạn thất bại");
        }
    };

    return (
        <>
            <DragDropContext onDragEnd={handleDragEnd} onDragUpdate={(u) => setOver(u.destination?.droppableId ?? null)}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAIN.length}, minmax(200px, 1fr))`, gap: 12, overflowX: "auto" }}>
                    {MAIN.map((stage) => {
                        const cards = byStage(stage);
                        const open = expanded.has(stage);
                        const shown = open ? cards : cards.slice(0, PREVIEW);
                        return (
                            <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 4, background: STAGE_COLORS[stage].color }} />
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{FIXED_STAGE_LABEL[stage]}</span>
                                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{cards.length}</span>
                                </div>
                                <Droppable droppableId={stage} isDropDisabled={!canManage}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{
                                                display: "flex", flexDirection: "column", gap: 8, minHeight: 120, padding: 6, borderRadius: 16,
                                                background: over === stage ? STAGE_COLORS[stage].bg : COLORS.fill,
                                            }}
                                        >
                                            {cards.length === 0 && (
                                                <span style={{ fontSize: 12, color: COLORS.textMuted, padding: "10px 8px" }}>Chưa có</span>
                                            )}
                                            {shown.map((app, index) => {
                                                const line = cardLine(app, stage, latestInterview.get(app.id), latestOffer.get(app.id));
                                                return (
                                                    <Draggable key={app.id} draggableId={String(app.id)} index={index} isDragDisabled={!canManage}>
                                                        {(dp, snap) => (
                                                            <div
                                                                ref={dp.innerRef}
                                                                {...dp.draggableProps}
                                                                {...dp.dragHandleProps}
                                                                onClick={() => (chosen.length > 0 && canManage
                                                                    ? toggle(app.id)
                                                                    : openApplication(`/candidates/${app.candidateId}/applications/${app.id}`))}
                                                                style={{
                                                                    display: "flex", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 12,
                                                                    background: COLORS.cardBg, cursor: "pointer",
                                                                    boxShadow: snap.isDragging ? "0 8px 24px rgba(0,0,0,0.15)"
                                                                        : selected.has(app.id) ? `inset 0 0 0 2px ${COLORS.primary}` : undefined,
                                                                    ...dp.draggableProps.style,
                                                                }}
                                                            >
                                                                {canManage && (
                                                                    <Checkbox
                                                                        checked={selected.has(app.id)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={() => toggle(app.id)}
                                                                        aria-label={`Chọn ${app.candidateName}`}
                                                                        style={{ marginTop: 4 }}
                                                                    />
                                                                )}
                                                                <Avatar name={app.candidateName} colorKey={app.candidateId} size={28} />
                                                                <div style={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1, minWidth: 0 }}>
                                                                    <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                        {app.candidateName}
                                                                    </span>
                                                                    <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{line.text}</span>
                                                                    {line.badge && (
                                                                        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.warning }}>{line.badge}</span>
                                                                    )}
                                                                </div>
                                                                {app.aiScore != null && <AiScorePill score={Math.round(app.aiScore)} size="sm" />}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                            {cards.length > PREVIEW && (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpanded((s) => {
                                                        const n = new Set(s);
                                                        if (n.has(stage)) n.delete(stage); else n.add(stage);
                                                        return n;
                                                    })}
                                                    style={{ all: "unset", cursor: "pointer", fontSize: 12, color: COLORS.primary, padding: "4px 8px" }}
                                                >
                                                    {open ? "Thu gọn" : `+ ${cards.length - PREVIEW} ứng viên khác`}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
                {canManage && (
                    <Droppable droppableId="REJECTED">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                    marginTop: 12, padding: "14px 16px", borderRadius: 16, textAlign: "center", fontSize: 13,
                                    border: `1px dashed ${over === "REJECTED" ? COLORS.error : COLORS.border}`,
                                    background: over === "REJECTED" ? STAGE_COLORS.REJECTED.bg : "transparent",
                                    color: COLORS.textSecondary,
                                }}
                            >
                                Kéo vào đây để từ chối · {rejectedCount} đã từ chối
                                <div style={{ display: "none" }}>{provided.placeholder}</div>
                            </div>
                        )}
                    </Droppable>
                )}
            </DragDropContext>

            {canManage && chosen.length > 0 && (
                <div style={{
                    position: "sticky", bottom: 16, zIndex: 5, marginTop: 12, width: "fit-content", marginInline: "auto",
                    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 14px", borderRadius: 18,
                    background: COLORS.cardBg, color: COLORS.textPrimary, boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                    border: `1px solid ${COLORS.border}`,
                }}>
                    <b style={{ marginRight: 6 }}>Đã chọn {chosen.length}</b>
                    {onCompare && (
                        <Button size="small" type="primary" disabled={chosen.length < 2 || chosen.length > 4} onClick={() => onCompare(chosen)}
                            title={chosen.length < 2 ? "Chọn ít nhất 2 ứng viên" : chosen.length > 4 ? "So sánh tối đa 4 ứng viên" : undefined}>
                            So sánh ({chosen.length})
                        </Button>
                    )}
                    <Button size="small" disabled={!nextStage} loading={busy && !bulk} onClick={advanceSelected}
                        title={!sameStage ? "Chọn các ứng viên cùng giai đoạn" : undefined}>
                        {nextStage ? `Chuyển sang ${FIXED_STAGE_LABEL[nextStage]}` : "Chuyển giai đoạn"}
                    </Button>
                    <Button size="small" onClick={() => { setAssignee(undefined); setBulk("assign"); }}>Giao người phụ trách</Button>
                    <Button size="small" danger onClick={() => { setReasonId(undefined); setRejectNote(""); setBulk("reject"); }}>Từ chối</Button>
                    <Button size="small" type="text" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
                </div>
            )}

            <SmallDialog
                open={bulk === "reject"}
                title={`Từ chối ${chosen.length} ứng viên`}
                subtitle={chosenApps.map((a) => a.candidateName).join(", ")}
                okText={`Từ chối ${chosen.length} ứng viên`}
                danger
                okDisabled={!reasonId}
                okLoading={busy}
                onCancel={() => setBulk(null)}
                onOk={rejectSelected}
            >
                <span style={{ fontSize: 13, fontWeight: 600 }}>Lý do từ chối</span>
                <Select value={reasonId} onChange={setReasonId} placeholder="Chọn lý do" style={{ width: "100%" }}
                    options={reasons.map((r) => ({ value: r.id, label: String(r.name) }))} />
                <Input.TextArea rows={2} maxLength={500} placeholder="Ghi chú nội bộ (không gửi cho ứng viên)"
                    value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Ứng viên sẽ nhận email thông báo kết quả, không kèm lý do.</span>
            </SmallDialog>

            <SmallDialog
                open={bulk === "assign"}
                title={`Giao người phụ trách cho ${chosen.length} ứng viên`}
                okText="Giao"
                okDisabled={!assignee}
                okLoading={busy}
                onCancel={() => setBulk(null)}
                onOk={assignSelected}
            >
                <Select value={assignee} onChange={setAssignee} placeholder="Chọn chuyên viên tuyển dụng" style={{ width: "100%" }}
                    options={recruiters.map((u) => ({ value: u.id, label: u.fullName }))} />
            </SmallDialog>

            <RejectApplicationModal
                open={rejectId != null}
                applicationId={rejectId}
                onClose={() => setRejectId(null)}
                onSuccess={() => { setRejectId(null); onChanged(); }}
            />
        </>
    );
}
