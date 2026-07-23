import { useCallback, useEffect, useState } from "react";
import {
    App,
    Button,
    Card,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Typography,
    Spin,
} from "antd";
import { DeleteOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { AxiosError } from "axios";
import type { ApiMessageResponse, PipelineResponse, StageType } from "../types";
import { createPipeline, deletePipeline, getPipelines, updatePipeline } from "../masterdataApi";

const { Title, Text } = Typography;

const STAGE_TYPE_OPTIONS: { value: StageType; label: string }[] = [
    { value: "APPLIED", label: "Ứng tuyển" },
    { value: "CV_SCREENING", label: "Sàng lọc CV" },
    { value: "HR_SCREENING", label: "Sàng lọc HR" },
    { value: "TECHNICAL_INTERVIEW", label: "Phỏng vấn kỹ thuật" },
    { value: "HR_INTERVIEW", label: "Phỏng vấn HR" },
    { value: "FINAL_INTERVIEW", label: "Phỏng vấn vòng cuối" },
    { value: "OFFER", label: "Đề nghị nhận việc" },
    { value: "HIRED", label: "Đã tuyển dụng" },
    { value: "REJECTED", label: "Từ chối" },
    { value: "CUSTOM", label: "Tùy chỉnh" },
];

const stageTypeLabel = (type: StageType) =>
    STAGE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

interface EditableStage {
    key: string;   // key cục bộ cho drag-drop — KHÔNG phải id thật bên BE
    id?: number;   // id thật nếu stage đã tồn tại (đã lưu)
    name: string;
    stageType: StageType;
}

const DEFAULT_STAGE_TEMPLATE: Omit<EditableStage, "key">[] = [
    { name: "Ứng tuyển", stageType: "APPLIED" },
    { name: "Sàng lọc CV", stageType: "CV_SCREENING" },
    { name: "Sàng lọc HR", stageType: "HR_SCREENING" },
    { name: "Phỏng vấn kỹ thuật", stageType: "TECHNICAL_INTERVIEW" },
    { name: "Phỏng vấn HR", stageType: "HR_INTERVIEW" },
    { name: "Phỏng vấn vòng cuối", stageType: "FINAL_INTERVIEW" },
    { name: "Đề nghị nhận việc", stageType: "OFFER" },
    { name: "Đã tuyển dụng", stageType: "HIRED" },
    { name: "Từ chối", stageType: "REJECTED" },
];

let localKeyCounter = 0;
const nextLocalKey = () => `new-${Date.now()}-${localKeyCounter++}`;

export default function PipelinePanel() {
    const { message } = App.useApp();
    const [pipelines, setPipelines] = useState<PipelineResponse[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [pipelineName, setPipelineName] = useState("");
    const [stages, setStages] = useState<EditableStage[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm] = Form.useForm();

    const [stageModalOpen, setStageModalOpen] = useState(false);
    const [stageForm] = Form.useForm();

    const applyPipelineToState = (pipeline: PipelineResponse) => {
        setSelectedId(pipeline.id);
        setPipelineName(pipeline.name);
        setStages(
            [...pipeline.stages]
                .sort((a, b) => a.stageOrder - b.stageOrder)
                .map((s) => ({ key: String(s.id), id: s.id, name: s.name, stageType: s.stageType }))
        );
    };

    const loadPipelines = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPipelines();
            setPipelines(res.data);
            if (res.data.length > 0) {
                applyPipelineToState(res.data[0]);
            }
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được danh sách quy trình");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPipelines();
    }, [loadPipelines]);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const reordered = Array.from(stages);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setStages(reordered);
    };

    const handleAddStage = async () => {
        try {
            const values = await stageForm.validateFields();
            setStages((prev) => [...prev, { key: nextLocalKey(), name: values.name, stageType: values.stageType }]);
            stageForm.resetFields();
            setStageModalOpen(false);
        } catch {
            // lỗi validate đã hiển thị trực tiếp trên field
        }
    };

    const handleRemoveStage = (key: string) => {
        setStages((prev) => prev.filter((s) => s.key !== key));
    };

    const handleSave = async () => {
        if (!selectedId) return;
        if (stages.length === 0) {
            message.error("Quy trình phải có ít nhất 1 giai đoạn");
            return;
        }
        setSaving(true);
        try {
            await updatePipeline(selectedId, {
                name: pipelineName,
                stages: stages.map((s, index) => ({
                    name: s.name,
                    stageType: s.stageType,
                    stageOrder: index + 1,
                })),
            });
            message.success("Lưu quy trình thành công");
            loadPipelines();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Lưu thất bại");
        } finally {
            setSaving(false);
        }
    };

    const handleCreatePipeline = async () => {
        try {
            const values = await createForm.validateFields();
            await createPipeline({
                name: values.name,
                stages: DEFAULT_STAGE_TEMPLATE.map((s, index) => ({
                    name: s.name,
                    stageType: s.stageType,
                    stageOrder: index + 1,
                })),
            });
            message.success("Tạo quy trình thành công");
            setCreateModalOpen(false);
            createForm.resetFields();
            loadPipelines();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            if (axiosErr.response?.data?.message) {
                message.error(axiosErr.response.data.message);
            }
        }
    };

    const handleDeletePipeline = async (id: number) => {
        try {
            await deletePipeline(id);
            message.success("Đã ẩn quy trình");
            loadPipelines();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Xóa thất bại");
        }
    };

    return (
        <div style={{ display: "flex", gap: 24 }}>
            <div style={{ width: 260 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <Title level={5} style={{ margin: 0 }}>
                        Danh sách quy trình
                    </Title>
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                        Thêm
                    </Button>
                </div>
                <Spin spinning={loading}>
                    <div style={{ border: "1px solid #f0f0f0", borderRadius: 8 }}>
                        {pipelines.length === 0 && (
                            <div style={{ padding: 16 }}>
                                <Empty description="Chưa có quy trình" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </div>
                        )}
                        {pipelines.map((pipeline, index) => (
                            <div
                                key={pipeline.id}
                                onClick={() => applyPipelineToState(pipeline)}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "12px 16px",
                                    cursor: "pointer",
                                    borderTop: index === 0 ? "none" : "1px solid #f0f0f0",
                                    background: pipeline.id === selectedId ? "#e6f4ff" : undefined,
                                }}
                            >
                                <span>
                                    <Text strong={pipeline.id === selectedId}>{pipeline.name}</Text>
                                    {pipeline.isDefault && <Text type="secondary"> (mặc định)</Text>}
                                </span>
                                <Popconfirm
                                    title="Ẩn quy trình này?"
                                    onConfirm={(e) => {
                                        e?.stopPropagation();
                                        handleDeletePipeline(pipeline.id);
                                    }}
                                    onCancel={(e) => e?.stopPropagation()}
                                >
                                    <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                                </Popconfirm>
                            </div>
                        ))}
                    </div>
                </Spin>
            </div>

            <div style={{ flex: 1 }}>
                {selectedId ? (
                    <Card
                        title={
                            <Input
                                value={pipelineName}
                                onChange={(e) => setPipelineName(e.target.value)}
                                variant="borderless"
                                style={{ fontSize: 16, fontWeight: 600, padding: 0 }}
                            />
                        }
                        extra={
                            <Space>
                                <Button icon={<PlusOutlined />} onClick={() => setStageModalOpen(true)}>
                                    Thêm giai đoạn
                                </Button>
                                <Button type="primary" loading={saving} onClick={handleSave}>
                                    Lưu quy trình
                                </Button>
                            </Space>
                        }
                    >
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="pipeline-stages">
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps}>
                                        {stages.map((stage, index) => (
                                            <Draggable key={stage.key} draggableId={stage.key} index={index}>
                                                {(dragProvided) => (
                                                    <div
                                                        ref={dragProvided.innerRef}
                                                        {...dragProvided.draggableProps}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 12,
                                                            padding: "10px 12px",
                                                            marginBottom: 8,
                                                            background: "#fafafa",
                                                            border: "1px solid #f0f0f0",
                                                            borderRadius: 6,
                                                            ...dragProvided.draggableProps.style,
                                                        }}
                                                    >
                                                        <span {...dragProvided.dragHandleProps}>
                                                            <HolderOutlined style={{ cursor: "grab", color: "#999" }} />
                                                        </span>
                                                        <Text strong style={{ width: 24 }}>
                                                            {index + 1}
                                                        </Text>
                                                        <div style={{ flex: 1 }}>
                                                            <div>{stage.name}</div>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                {stageTypeLabel(stage.stageType)}
                                                            </Text>
                                                        </div>
                                                        <Button
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => handleRemoveStage(stage.key)}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>

                        {stages.length === 0 && <Empty description="Chưa có giai đoạn nào" />}
                    </Card>
                ) : (
                    <Empty description="Chưa có quy trình tuyển dụng nào, bấm Thêm để tạo mới" />
                )}
            </div>

            <Modal
                title="Tạo quy trình tuyển dụng mới"
                open={createModalOpen}
                onOk={handleCreatePipeline}
                onCancel={() => setCreateModalOpen(false)}
                okText="Tạo mới"
                cancelText="Hủy"
            >
                <Form form={createForm} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Tên quy trình"
                        rules={[{ required: true, message: "Tên quy trình không được để trống" }]}
                    >
                        <Input placeholder="vd: Quy trình tuyển Backend Developer" />
                    </Form.Item>
                </Form>
                <Text type="secondary">
                    Quy trình mới sẽ được tạo sẵn 9 giai đoạn mặc định, bạn có thể chỉnh sửa lại sau khi tạo.
                </Text>
            </Modal>

            <Modal
                title="Thêm giai đoạn"
                open={stageModalOpen}
                onOk={handleAddStage}
                onCancel={() => setStageModalOpen(false)}
                okText="Thêm"
                cancelText="Hủy"
            >
                <Form form={stageForm} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Tên giai đoạn"
                        rules={[{ required: true, message: "Tên giai đoạn không được để trống" }]}
                    >
                        <Input placeholder="vd: Phỏng vấn nhóm" />
                    </Form.Item>
                    <Form.Item
                        name="stageType"
                        label="Loại giai đoạn"
                        rules={[{ required: true, message: "Vui lòng chọn loại giai đoạn" }]}
                    >
                        <Select options={STAGE_TYPE_OPTIONS} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}