import { useCallback, useEffect, useState } from "react";
import { Typography, Tag, Empty, Spin, message, Tooltip } from "antd";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { CalendarOutlined, UserOutlined, InboxOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getApplications } from "../candidateApi";
import { getPostingById } from "../../recruitment/recruitmentApi";
import { getPipelines } from "../../masterdata/masterdataApi";
import type { PipelineStageResponse } from "../../masterdata/types";
import type { ApiMessageResponse, ApplicationResponse } from "../types";
import RejectApplicationModal from "./RejectApplicationModal";
import { useTrailNavigate } from "../../../app/useNavTrail";
import dayjs from "dayjs";
import { FIXED_STAGES, STAGE_COLORS, type FixedStage } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { advanceSteps, stepsToFixedStage } from "../stageAdvance";

const { Text } = Typography;

interface Props {
    jobPostingId: number;
}

/* Màu cột theo 6 giai đoạn cố định (DS01): cùng màu với thẻ, thanh tiến trình, phễu. */
function getStageColor(stage: FixedStage) {
    const c = STAGE_COLORS[stage];
    return { border: c.color, header: c.bg, badge: "default", avatar: c.color };
}

/* Get initials from name */
function getInitials(name: string) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export default function ApplicationKanbanBoard({ jobPostingId }: Props) {
    const openApplication = useTrailNavigate();
    const [stages, setStages] = useState<PipelineStageResponse[]>([]);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggingOver, setDraggingOver] = useState<string | null>(null);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);

    const loadBoard = useCallback(async () => {
        setLoading(true);
        try {
            const postingRes = await getPostingById(jobPostingId);
            const pipelineListRes = await getPipelines();
            const pipeline = pipelineListRes.data.find((p) => p.id === postingRes.data.pipelineId);
            setStages(pipeline ? [...pipeline.stages].sort((a, b) => a.stageOrder - b.stageOrder) : []);
            const appsRes = await getApplications({ jobPostingId });
            setApplications(appsRes.data.content);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [jobPostingId]);

    useEffect(() => { loadBoard(); }, [loadBoard]);

    const handleDragEnd = async (result: DropResult) => {
        setDraggingOver(null);
        if (!result.destination) return;
        const applicationId = Number(result.draggableId);
        const source = result.source.droppableId as FixedStage;
        const dest = result.destination.droppableId as FixedStage;
        if (source === dest) return;

        if (dest === "REJECTED") {
            setPendingRejectId(applicationId);
            setRejectModalOpen(true);
            return;
        }
        const app = applications.find((a) => a.id === applicationId);
        // Cột là 6 giai đoạn cố định; tin cũ có quy trình 9 bước thì có thể phải đi nhiều bước.
        const steps = app ? stepsToFixedStage(stages, app.currentStageId, dest) : null;
        if (!steps) {
            message.warning("Chỉ được chuyển sang giai đoạn kế tiếp hoặc kéo sang cột Từ chối");
            return;
        }
        try {
            await advanceSteps(applicationId, steps);
            message.success("Đã chuyển giai đoạn ✓");
            loadBoard();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Chuyển giai đoạn thất bại");
        }
    };

    // 6 cột cố định theo thứ tự DS06, chỉ hiện nhóm có trong quy trình của tin.
    const groups = FIXED_STAGES.filter((g) => stages.some((s) => toFixedStage(s.stageType) === g));

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Spin size="large" />
        </div>
    );

    if (stages.length === 0) return (
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không tải được quy trình tuyển dụng cho tin này"
        />
    );

    return (
        <>
            <DragDropContext
                onDragEnd={handleDragEnd}
                onDragUpdate={(update) => setDraggingOver(update.destination?.droppableId || null)}
            >
                <div className="kanban-wrapper">
                    {groups.map((stage) => {
                        const cardsInStage = applications.filter((a) => toFixedStage(a.currentStageType) === stage);
                        const colors = getStageColor(stage);
                        const isOver = draggingOver === stage;

                        return (
                            <div key={stage} className="kanban-column">
                                {/* Column Header */}
                                <div
                                    className="kanban-column-header"
                                    style={{
                                        borderBottomColor: colors.border,
                                        background: colors.header,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{
                                            width: 10, height: 10, borderRadius: "50%",
                                            background: colors.border, flexShrink: 0,
                                        }} />
                                        <Text strong style={{ fontSize: 14, color: "#182431" }}>{FIXED_STAGE_LABEL[stage]}</Text>
                                    </div>
                                    <Tag
                                        color={colors.badge}
                                        style={{ borderRadius: 12, fontWeight: 600, minWidth: 24, textAlign: "center" }}
                                    >
                                        {cardsInStage.length}
                                    </Tag>
                                </div>

                                {/* Droppable area */}
                                <Droppable droppableId={stage}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`kanban-column-body${isOver ? " is-dragging-over" : ""}`}
                                        >
                                            {cardsInStage.length === 0 ? (
                                                <div className="kanban-empty">
                                                    <InboxOutlined style={{ fontSize: 28, color: "#18243166", marginBottom: 8 }} />
                                                    <span style={{ fontSize: 12 }}>Chưa có ứng viên</span>
                                                </div>
                                            ) : (
                                                cardsInStage.map((app, index) => (
                                                    <Draggable key={app.id} draggableId={String(app.id)} index={index}>
                                                        {(dragProvided, snapshot) => (
                                                            <div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                {...dragProvided.dragHandleProps}
                                                                className="kanban-card"
                                                                style={{
                                                                    borderLeftColor: colors.border,
                                                                    opacity: snapshot.isDragging ? 0.9 : 1,
                                                                    boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : undefined,
                                                                    ...dragProvided.draggableProps.style,
                                                                }}
                                                                onClick={() => {
                                                                    openApplication(`/candidates/${app.candidateId}/applications/${app.id}`);
                                                                }}
                                                            >
                                                                {/* Card Header: avatar + name */}
                                                                <div className="kanban-card-header">
                                                                    <div
                                                                        className="kanban-card-avatar"
                                                                        style={{ background: colors.avatar }}
                                                                    >
                                                                        {getInitials(app.candidateName)}
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div className="kanban-card-name truncate">
                                                                            {app.candidateName}
                                                                        </div>
                                                                        <div className="kanban-card-meta">
                                                                            <UserOutlined style={{ fontSize: 10 }} />
                                                                            <span className="truncate">{app.recruitmentSourceName}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Card Footer */}
                                                                <div style={{
                                                                    display: "flex", justifyContent: "space-between",
                                                                    alignItems: "center", marginTop: 8, paddingTop: 8,
                                                                    borderTop: "1px solid #1824311A",
                                                                }}>
                                                                    <Tooltip title="Ngày ứng tuyển">
                                                                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#18243166" }}>
                                                                            <CalendarOutlined />
                                                                            {dayjs(app.appliedAt).format("DD/MM")}
                                                                        </span>
                                                                    </Tooltip>
                                                                    {app.assignedRecruiterName && (
                                                                        <Tooltip title={`Phụ trách: ${app.assignedRecruiterName}`}>
                                                                            <div style={{
                                                                                width: 22, height: 22, borderRadius: 6,
                                                                                background: "#1824311A",
                                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                                fontSize: 10, fontWeight: 600, color: "#18243199",
                                                                            }}>
                                                                                {getInitials(app.assignedRecruiterName)}
                                                                            </div>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>

            <RejectApplicationModal
                open={rejectModalOpen}
                applicationId={pendingRejectId}
                onClose={() => { setRejectModalOpen(false); setPendingRejectId(null); }}
                onSuccess={() => { setRejectModalOpen(false); setPendingRejectId(null); loadBoard(); }}
            />
        </>
    );
}
