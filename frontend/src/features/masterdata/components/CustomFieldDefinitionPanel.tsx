import { useCallback, useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Tag, Space, App } from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
    getCustomFieldDefinitions,
    createCustomFieldDefinition,
    updateCustomFieldDefinition,
    deleteCustomFieldDefinition,
} from "../../candidate/customFieldApi";
import type { ApiMessageResponse, CustomFieldDefinition, CustomFieldType } from "../../candidate/types";
import { COLORS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { PageToolbar, IconAction, ModalTitle } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";

const TYPE_LABEL: Record<CustomFieldType, string> = {
    TEXT: "Văn bản",
    NUMBER: "Số",
    DATE: "Ngày",
};

export default function CustomFieldDefinitionPanel() {
    const [items, setItems] = useState<CustomFieldDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CustomFieldDefinition | null>(null);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCustomFieldDefinitions();
            setItems(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const openCreateModal = () => {
        setEditingItem(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (item: CustomFieldDefinition) => {
        setEditingItem(item);
        form.setFieldsValue(item);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingItem) {
                await updateCustomFieldDefinition(editingItem.id, values);
                message.success("Cập nhật thành công");
            } else {
                await createCustomFieldDefinition(values);
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
            await deleteCustomFieldDefinition(id);
            message.success("Xóa thành công");
            loadItems();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Xóa thất bại");
        }
    };


    const columns = [
        { title: "Khóa (fieldKey)", dataIndex: "fieldKey", key: "fieldKey", ellipsis: true },
        { title: "Nhãn hiển thị", dataIndex: "fieldLabel", key: "fieldLabel", ellipsis: true },
        {
            title: "Kiểu dữ liệu",
            dataIndex: "fieldType",
            key: "fieldType",
            width: 140,
            render: (t: CustomFieldType) => TYPE_LABEL[t],
        },
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
            render: (_: unknown, record: CustomFieldDefinition) => (
                <Space size={4}>
                    <IconAction title="Sửa" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <IconAction
                        title="Ẩn trường này"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDelete(record.id)}
                        confirm={{
                            title: "Ẩn trường tùy chỉnh này?",
                            description: "Trường này sẽ bị ẩn khỏi form ứng viên, không xóa dữ liệu đã lưu.",
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
                        Trường tùy chỉnh (Ứng viên)
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
                pagination={{ pageSize: 10, ...listPagination("trường") }}
                locale={{
                    emptyText: loading ? <span /> : (
                        <EmptyState
                            title="Chưa có trường tùy chỉnh nào"
                            description="Thêm trường để thu thập thông tin riêng của công ty trên hồ sơ ứng viên."
                        />
                    ),
                }}
            />

            <Modal
                title={
                    <ModalTitle
                        icon={editingItem ? <EditOutlined /> : <PlusOutlined />}
                        title={editingItem ? "Sửa trường tùy chỉnh" : "Thêm trường tùy chỉnh"}
                        subtitle="Trường bổ sung hiển thị trên form hồ sơ ứng viên"
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
                    <Form.Item
                        name="fieldKey"
                        label="Khóa (fieldKey — dùng nội bộ, không dấu, không khoảng trắng)"
                        rules={[{ required: true, message: "Nhập khóa trường" }]}
                    >
                        <Input placeholder="vd: referral_code" disabled={!!editingItem} />
                    </Form.Item>
                    <Form.Item
                        name="fieldLabel"
                        label="Nhãn hiển thị"
                        rules={[{ required: true, message: "Nhập nhãn hiển thị" }]}
                    >
                        <Input placeholder="vd: Mã giới thiệu" />
                    </Form.Item>
                    <Form.Item
                        name="fieldType"
                        label="Kiểu dữ liệu"
                        rules={[{ required: true, message: "Chọn kiểu dữ liệu" }]}
                    >
                        <Select
                            options={(Object.keys(TYPE_LABEL) as CustomFieldType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
