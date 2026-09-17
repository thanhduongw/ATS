import { useCallback, useEffect, useState } from "react";
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Tag,
    Typography,
    App,
    Space,
    Alert,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { CatalogConfig, CatalogItem, ApiMessageResponse } from "../types";
import {
    getCatalogItems,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    previewEmailTemplate,
} from "../masterdataApi";
import { COLORS, RADIUS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { PageToolbar, IconAction, ModalTitle } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";

const { Text, Paragraph } = Typography;

const SAMPLE_KEYS = ["title", "message", "recipientName", "resourceType", "resourceId"];

/** Phải khớp CHÍNH XÁC enum NotificationType bên notification-service — đây là khóa tra cứu template khi gửi email thật. */
const NOTIFICATION_TYPE_CODES = [
    "REQUISITION_PENDING_APPROVAL",
    "APPLICATION_CREATED",
    "APPLICATION_STAGE_CHANGED",
    "APPLICATION_REJECTED",
    "INTERVIEW_SCHEDULED",
    "INTERVIEW_CONFIRMED",
    "INTERVIEW_REMINDER",
    "EVALUATION_INCOMPLETE_REMINDER",
    "OFFER_PENDING_CONFIRMATION",
    "OFFER_READY_FOR_CANDIDATE",
    "OFFER_ACCEPTED",
    "OFFER_DECLINED",
    "APPLICATION_COMMENT_MENTION",
    "APPLICATION_STALE_REMINDER",
];

interface Props {
    config: CatalogConfig;
}

export default function EmailTemplatePanel({ config }: Props) {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);
    const [previewForm] = Form.useForm();
    const [previewResult, setPreviewResult] = useState<{ subject: string; body: string } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCatalogItems(config.endpoint);
            setItems(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [config.endpoint, message]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const openCreateModal = () => {
        setEditingItem(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (item: CatalogItem) => {
        setEditingItem(item);
        form.setFieldsValue(item);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingItem) {
                await updateCatalogItem(config.endpoint, editingItem.id, values);
                message.success("Cập nhật thành công");
            } else {
                await createCatalogItem(config.endpoint, values);
                message.success("Thêm mới thành công");
            }
            setModalOpen(false);
            loadItems();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            if (axiosErr.response?.data?.message) {
                message.error(axiosErr.response.data.message);
            }
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteCatalogItem(config.endpoint, id);
            message.success("Xóa thành công");
            loadItems();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Xóa thất bại");
        }
    };

    const openPreview = (item: CatalogItem) => {
        setPreviewItem(item);
        setPreviewResult(null);
        previewForm.setFieldsValue({
            title: "Hồ sơ ứng tuyển mới",
            message: "Nguyễn Văn A vừa nộp hồ sơ ứng tuyển vị trí Backend Developer.",
            recipientName: "Trần Thị B",
            resourceType: "APPLICATION",
            resourceId: "123",
        });
        setPreviewOpen(true);
    };

    const handleRunPreview = async () => {
        if (!previewItem) return;
        setPreviewLoading(true);
        try {
            const sampleData = await previewForm.validateFields();
            const res = await previewEmailTemplate(previewItem.id, sampleData);
            setPreviewResult(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            if (axiosErr.response?.data?.message) {
                message.error(axiosErr.response.data.message);
            }
        } finally {
            setPreviewLoading(false);
        }
    };

    const dataColumns = config.fields
        .filter((f) => !f.hideInTable)
        .map((f) => ({ title: f.label, dataIndex: f.name, key: f.name }));

    const columns = [
        ...dataColumns,
        {
            title: "Trạng thái",
            dataIndex: "active",
            key: "active",
            render: (active: boolean) =>
                active ? <Tag color="green">Đang dùng</Tag> : <Tag color="default">Đã ẩn</Tag>,
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 120,
            render: (_: unknown, record: CatalogItem) => (
                <Space size={4}>
                    <IconAction title="Xem trước" icon={<EyeOutlined />} onClick={() => openPreview(record)} />
                    <IconAction title="Sửa" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <IconAction
                        title="Ẩn khỏi danh sách"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDelete(record.id)}
                        confirm={{
                            title: "Ẩn mẫu email này?",
                            description: "Mục này sẽ được ẩn khỏi danh sách sử dụng, không xóa vĩnh viễn.",
                            okText: "Ẩn",
                        }}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <PageToolbar
                left={
                    <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>
                        {config.title}
                    </span>
                }
                right={
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                        Thêm mới
                    </Button>
                }
            />

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12, borderRadius: RADIUS.md }}
                title="Biến khả dụng trong Tiêu đề/Nội dung"
                description={
                    <span>
                        Dùng cú pháp <Text code>{"{{tên_biến}}"}</Text> — ví dụ <Text code>{"{{recipientName}}"}</Text>.
                        Các biến hỗ trợ: {SAMPLE_KEYS.map((k) => <Text code key={k} style={{ marginRight: 4 }}>{`{{${k}}}`}</Text>)}
                    </span>
                }
            />

            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={columns}
                dataSource={items}
                pagination={{ pageSize: 10, ...listPagination("mẫu email") }}
                locale={{
                    emptyText: loading ? <span /> : (
                        <EmptyState
                            title="Chưa có mẫu email nào"
                            description="Thêm mẫu để hệ thống gửi email tự động cho ứng viên."
                        />
                    ),
                }}
            />

            <Modal
                title={
                    <ModalTitle
                        icon={editingItem ? <EditOutlined /> : <PlusOutlined />}
                        title={editingItem ? `Sửa ${config.title.toLowerCase()}` : `Thêm ${config.title.toLowerCase()}`}
                        subtitle="Mẫu email gửi tự động theo sự kiện tuyển dụng"
                    />
                }
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? "Cập nhật" : "Thêm mới"}
                cancelText="Hủy"
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
                    {config.fields.map((field) => (
                        <Form.Item
                            key={field.name}
                            name={field.name}
                            label={field.label}
                            rules={field.required ? [{ required: true, message: `${field.label} không được để trống` }] : []}
                        >
                            {field.name === "code" ? (
                                <Select
                                    placeholder="Chọn loại thông báo cần gửi email"
                                    options={NOTIFICATION_TYPE_CODES.map((c) => ({ value: c, label: c }))}
                                />
                            ) : field.type === "textarea" ? (
                                <Input.TextArea rows={4} />
                            ) : (
                                <Input />
                            )}
                        </Form.Item>
                    ))}
                </Form>
            </Modal>

            <Modal
                title={`Xem trước — ${previewItem?.code ?? ""}`}
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setPreviewOpen(false)}>Đóng</Button>,
                    <Button key="run" type="primary" loading={previewLoading} onClick={handleRunPreview}>
                        Render thử
                    </Button>,
                ]}
                width={640}
                destroyOnHidden
            >
                <Paragraph type="secondary">Nhập dữ liệu mẫu rồi bấm "Render thử" — không gửi email thật.</Paragraph>
                <Form form={previewForm} layout="vertical">
                    {SAMPLE_KEYS.map((key) => (
                        <Form.Item key={key} name={key} label={`{{${key}}}`}>
                            <Input />
                        </Form.Item>
                    ))}
                </Form>

                {previewResult && (
                    <div style={{ marginTop: 16, padding: 16, background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                        <Text strong>Tiêu đề: </Text>
                        <div style={{ marginBottom: 12 }}>{previewResult.subject}</div>
                        <Text strong>Nội dung:</Text>
                        <Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{previewResult.body}</Paragraph>
                    </div>
                )}
            </Modal>
        </div>
    );
}
