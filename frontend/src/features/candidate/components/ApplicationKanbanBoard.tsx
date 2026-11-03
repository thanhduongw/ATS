import { useState } from "react";
import { App } from "antd";
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
import { AiScorePill, Avatar } from "../../../components/ui/designKit";

/**
 * R09 · Trang việc làm — ứng viên theo giai đoạn.
 * 5 cột chính (Ứng tuyển → Đã tuyển), dải "Kéo vào đây để từ chối" ở dưới.
 * Mỗi cột hiện tối đa 4 thẻ, còn lại gom thành "+ N ứng viên khác" (bấm để mở hết).
 * Chỉ được kéo sang giai đoạn kế tiếp (API chỉ cho đi tới) hoặc sang Từ chối.
 */
interface Props {
    applications: ApplicationResponse[];
    stages: PipelineStageResponse[];
    interviews: InterviewResponse[];
    offers: OfferResponse[];
    canManage: boolean;
    onChanged: () => void;
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
                : iv.status === "HM_RESCHEDULE_PROPOSED" ? "Đề xuất đổi giờ" : null;
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

export default function ApplicationKanbanBoard({ applications, stages, interviews, offers, canManage, onChanged }: Props) {
    const { message } = App.useApp();
    const openApplication = useTrailNavigate();
    const [expanded, setExpanded] = useState<Set<FixedStage>>(new Set());
    const [over, setOver] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<number | null>(null);

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
                                                                onClick={() => openApplication(`/candidates/${app.candidateId}/applications/${app.id}`)}
                                                                style={{
                                                                    display: "flex", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 12,
                                                                    background: COLORS.cardBg, cursor: "pointer",
                                                                    boxShadow: snap.isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : undefined,
                                                                    ...dp.draggableProps.style,
                                                                }}
                                                            >
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

            <RejectApplicationModal
                open={rejectId != null}
                applicationId={rejectId}
                onClose={() => setRejectId(null)}
                onSuccess={() => { setRejectId(null); onChanged(); }}
            />
        </>
    );
}
