import { useCallback, useEffect, useState } from "react";
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Tag,
    Popconfirm,
    message,
    Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { CatalogConfig, CatalogItem, ApiMessageResponse } from "../types";
import {
    getCatalogItems,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
} from "../masterdataApi";

const { Title } = Typography;

interface CatalogPanelProps {
    config: CatalogConfig;
}

export default function CatalogPanel({ config }: CatalogPanelProps) {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [form] = Form.useForm();

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
    }, [config.endpoint]);

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
            message.success("Xóa thành công");
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
        }));

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
            render: (_: unknown, record: CatalogItem) => (
                <>
                    <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Xác nhận xóa?"
                        description="Mục này sẽ được ẩn khỏi danh sách sử dụng, không xóa vĩnh viễn."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </>
            ),
        },
    ];

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                }}
            >
                <Title level={4} style={{ margin: 0 }}>
                    {config.title}
                </Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Thêm mới
                </Button>
            </div>

            <Table rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={{ pageSize: 10 }} />

            <Modal
                title={editingItem ? `Sửa ${config.title.toLowerCase()}` : `Thêm ${config.title.toLowerCase()}`}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? "Cập nhật" : "Thêm mới"}
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={form} layout="vertical">
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