import { useCallback, useEffect, useState } from "react";
import { Typography, Tag, Card, Empty, Spin, message } from "antd";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { AxiosError } from "axios";
import { getApplications, advanceApplicationStage } from "../candidateApi";
import { getPostingById } from "../../recruitment/recruitmentApi";
import { getPipelines } from "../../masterdata/masterdataApi";
import type { PipelineStageResponse } from "../../masterdata/types";
import type { ApiMessageResponse, ApplicationResponse } from "../types";
import ApplicationDetailDrawer from "./ApplicationDetailDrawer";
import RejectApplicationModal from "./RejectApplicationModal";

const { Text } = Typography;

interface Props {
  jobPostingId: number;
}

export default function ApplicationKanbanBoard({ jobPostingId }: Props) {
  const [stages, setStages] = useState<PipelineStageResponse[]>([]);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null);

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
      setApplications(appsRes.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [jobPostingId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleDragEnd = async (result: DropResult) => {
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
      message.error("Chỉ được chuyển sang giai đoạn kế tiếp trong quy trình, hoặc kéo sang cột Từ chối");
      return;
    }

    try {
      await advanceApplicationStage(applicationId, {});
      message.success("Đã chuyển giai đoạn");
      loadBoard();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Chuyển giai đoạn thất bại");
    }
  };

  const handleRejectSuccess = () => {
    setRejectModalOpen(false);
    setPendingRejectId(null);
    loadBoard();
  };

  if (loading) return <Spin />;
  if (stages.length === 0) return <Empty description="Không tải được quy trình tuyển dụng cho tin này" />;

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          {stages.map((stage) => {
            const cardsInStage = applications.filter((a) => a.currentStageId === stage.id);
            return (
              <div key={stage.id} style={{ minWidth: 260, flexShrink: 0 }}>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                  <Text strong>{stage.name}</Text>
                  <Tag>{cardsInStage.length}</Tag>
                </div>
                <Droppable droppableId={String(stage.id)}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ background: "#fafafa", borderRadius: 6, minHeight: 400, padding: 8 }}
                    >
                      {cardsInStage.map((app, index) => (
                        <Draggable key={app.id} draggableId={String(app.id)} index={index}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{ marginBottom: 8, ...dragProvided.draggableProps.style }}
                            >
                              <Card
                                size="small"
                                hoverable
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setDetailOpen(true);
                                }}
                              >
                                <Text strong>{app.candidateName}</Text>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {app.recruitmentSourceName}
                                  </Text>
                                </div>
                                {app.assignedRecruiterName && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      Phụ trách: {app.assignedRecruiterName}
                                    </Text>
                                  </div>
                                )}
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ApplicationDetailDrawer open={detailOpen} application={selectedApplication} onClose={() => setDetailOpen(false)} />

      <RejectApplicationModal
        open={rejectModalOpen}
        applicationId={pendingRejectId}
        onClose={() => {
          setRejectModalOpen(false);
          setPendingRejectId(null);
        }}
        onSuccess={handleRejectSuccess}
      />
    </>
  );
}
