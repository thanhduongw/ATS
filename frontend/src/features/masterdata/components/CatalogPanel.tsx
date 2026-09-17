import { useCallback, useEffect, useState } from "react";
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Tag,
    Space,
    App,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { CatalogConfig, CatalogItem, ApiMessageResponse } from "../types";
import {
    getCatalogItems,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
} from "../masterdataApi";
import { COLORS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { PageToolbar, IconAction, ModalTitle } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";

interface CatalogPanelProps {
    config: CatalogConfig;
}

export default function CatalogPanel({ config }: CatalogPanelProps) {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [form] = Form.useForm();
    const { message } = App.useApp();

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
            // Nếu là lỗi validate của Form (chưa gọi API) thì antd tự hiển thị lỗi trên field
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteCatalogItem(config.endpoint, id);
            message.success("Đã ẩn khỏi danh sách sử dụng");
            loadItems();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Xóa thất bại");
        }
    };

    const dataColumns = config.fields
        .filter((f) => !f.hideInTable)
        .map((f) => ({
            title: f.label,
            dataIndex: f.name,
            key: f.name,
            ellipsis: true,
        }));

    const columns = [
        ...dataColumns,
        {
            title: "Trạng thái",
            dataIndex: "active",
            key: "active",
            width: 120,
            render: (active: boolean) =>
                active ? (
                    <Tag color="success" style={{ margin: 0 }}>Đang dùng</Tag>
                ) : (
                    <Tag color="default" style={{ margin: 0 }}>Đã ẩn</Tag>
                ),
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 90,
            render: (_: unknown, record: CatalogItem) => (
                <Space size={4}>
                    <IconAction
                        title="Sửa"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    />
                    <IconAction
                        title="Ẩn khỏi danh sách"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDelete(record.id)}
                        confirm={{
                            title: "Ẩn mục này?",
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

            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={columns}
                dataSource={items}
                pagination={{ pageSize: 10, ...listPagination("mục") }}
                locale={{
                    emptyText: loading ? <span /> : (
                        <EmptyState
                            title={`Chưa có ${config.title.toLowerCase()} nào`}
                            description="Nhấn “Thêm mới” để tạo mục đầu tiên cho danh mục này."
                        />
                    ),
                }}
            />

            <Modal
                title={
                    <ModalTitle
                        icon={editingItem ? <EditOutlined /> : <PlusOutlined />}
                        title={
                            editingItem
                                ? `Sửa ${config.title.toLowerCase()}`
                                : `Thêm ${config.title.toLowerCase()}`
                        }
                        subtitle="Dữ liệu danh mục dùng chung cho toàn hệ thống"
                    />
                }
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? "Cập nhật" : "Thêm mới"}
                cancelText="Hủy"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                    {config.fields.map((field) => (
                        <Form.Item
                            key={field.name}
                            name={field.name}
                            label={field.label}
                            rules={field.required ? [{ required: true, message: `${field.label} không được để trống` }] : []}
                        >
                            {field.type === "number" ? (
                                <InputNumber style={{ width: "100%" }} min={0} />
                            ) : field.type === "textarea" ? (
                                <Input.TextArea rows={4} />
                            ) : (
                                <Input />
                            )}
                        </Form.Item>
                    ))}
                </Form>
            </Modal>
        </div>
    );
}
