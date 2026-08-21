import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Tag, Empty, Spin, message, Tooltip } from "antd";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { CalendarOutlined, UserOutlined, InboxOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getApplications, advanceApplicationStage } from "../candidateApi";
import { getPostingById } from "../../recruitment/recruitmentApi";
import { getPipelines } from "../../masterdata/masterdataApi";
import type { PipelineStageResponse } from "../../masterdata/types";
import type { ApiMessageResponse, ApplicationResponse } from "../types";
import RejectApplicationModal from "./RejectApplicationModal";
import dayjs from "dayjs";

const { Text } = Typography;

interface Props {
    jobPostingId: number;
}

/* Stage type → accent color */
const STAGE_COLORS: Record<string, { border: string; header: string; badge: string; avatar: string }> = {
    APPLICATION: { border: "#3B82F6", header: "#EFF6FF", badge: "blue", avatar: "#3B82F6" },
    SCREENING: { border: "#8B5CF6", header: "#F5F3FF", badge: "purple", avatar: "#8B5CF6" },
    INTERVIEW: { border: "#F59E0B", header: "#FFFBEB", badge: "gold", avatar: "#F59E0B" },
    OFFER: { border: "#10B981", header: "#ECFDF5", badge: "success", avatar: "#10B981" },
    HIRED: { border: "#22C55E", header: "#F0FDF4", badge: "success", avatar: "#22C55E" },
    REJECTED: { border: "#EF4444", header: "#FEF2F2", badge: "error", avatar: "#EF4444" },
};

const DEFAULT_STAGE_COLOR = { border: "#6B7280", header: "#F9FAFB", badge: "default", avatar: "#6B7280" };

function getStageColor(stageType: string) {
    return STAGE_COLORS[stageType] || DEFAULT_STAGE_COLOR;
}

/* Get initials from name */
function getInitials(name: string) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export default function ApplicationKanbanBoard({ jobPostingId }: Props) {
    const navigate = useNavigate();
    const [stages, setStages] = useState<PipelineStageResponse[]>([]);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(false);
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
        const sourceStageId = Number(result.source.droppableId);
        const destStageId = Number(result.destination.droppableId);
        if (sourceStageId === destStageId) return;

        const sourceStage = stages.find((s) => s.id === sourceStageId);
        const destStage = stages.find((s) => s.id === destStageId);
        if (!sourceStage || !destStage) return;

        if (destStage.stageType === "REJECTED") {
            setPendingRejectId(applicationId);
            setRejectModalOpen(true);
            return;
        }
        if (destStage.stageOrder !== sourceStage.stageOrder + 1) {
            message.warning("Chỉ được chuyển sang giai đoạn kế tiếp hoặc kéo sang cột Từ chối");
            return;
        }
        try {
            await advanceApplicationStage(applicationId, {});
            message.success("Đã chuyển giai đoạn ✓");
            loadBoard();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Chuyển giai đoạn thất bại");
        }
    };

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
                    {stages.map((stage) => {
                        const cardsInStage = applications.filter((a) => a.currentStageId === stage.id);
                        const colors = getStageColor(stage.stageType);
                        const isOver = draggingOver === String(stage.id);

                        return (
                            <div key={stage.id} className="kanban-column">
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
                                        <Text strong style={{ fontSize: 14, color: "#111827" }}>{stage.name}</Text>
                                    </div>
                                    <Tag
                                        color={colors.badge}
                                        style={{ borderRadius: 12, fontWeight: 600, minWidth: 24, textAlign: "center" }}
                                    >
                                        {cardsInStage.length}
                                    </Tag>
                                </div>

                                {/* Droppable area */}
                                <Droppable droppableId={String(stage.id)}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`kanban-column-body${isOver ? " is-dragging-over" : ""}`}
                                        >
                                            {cardsInStage.length === 0 ? (
                                                <div className="kanban-empty">
                                                    <InboxOutlined style={{ fontSize: 28, color: "#D1D5DB", marginBottom: 8 }} />
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
                                                                    navigate(`/candidates/${app.candidateId}/applications/${app.id}`);
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
                                                                    borderTop: "1px solid #F3F4F6",
                                                                }}>
                                                                    <Tooltip title="Ngày ứng tuyển">
                                                                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9CA3AF" }}>
                                                                            <CalendarOutlined />
                                                                            {dayjs(app.appliedAt).format("DD/MM")}
                                                                        </span>
                                                                    </Tooltip>
                                                                    {app.assignedRecruiterName && (
                                                                        <Tooltip title={`Phụ trách: ${app.assignedRecruiterName}`}>
                                                                            <div style={{
                                                                                width: 22, height: 22, borderRadius: 6,
                                                                                background: "#E5E7EB",
                                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                                fontSize: 10, fontWeight: 600, color: "#6B7280",
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
