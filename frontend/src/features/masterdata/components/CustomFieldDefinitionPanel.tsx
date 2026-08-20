import { useCallback, useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Typography, App } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
    getCustomFieldDefinitions,
    createCustomFieldDefinition,
    updateCustomFieldDefinition,
    deleteCustomFieldDefinition,
} from "../../candidate/customFieldApi";
import type { ApiMessageResponse, CustomFieldDefinition, CustomFieldType } from "../../candidate/types";

const { Title } = Typography;

const TYPE_LABEL: Record<CustomFieldType, string> = {
    TEXT: "Văn bản",
    NUMBER: "Số",
    DATE: "Ngày",
};

export default function CustomFieldDefinitionPanel() {
    const [items, setItems] = useState<CustomFieldDefinition[]>([]);
    const [loading, setLoading] = useState(false);
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
        { title: "Khóa (fieldKey)", dataIndex: "fieldKey", key: "fieldKey" },
        { title: "Nhãn hiển thị", dataIndex: "fieldLabel", key: "fieldLabel" },
        {
            title: "Kiểu dữ liệu",
            dataIndex: "fieldType",
            key: "fieldType",
            render: (t: CustomFieldType) => TYPE_LABEL[t],
        },
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
            render: (_: unknown, record: CustomFieldDefinition) => (
                <>
                    <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Xác nhận xóa?"
                        description="Trường này sẽ bị ẩn khỏi form ứng viên, không xóa dữ liệu đã lưu."
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                    Trường tùy chỉnh (Ứng viên)
                </Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Thêm mới
                </Button>
            </div>

            <Table rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={{ pageSize: 10 }} />

            <Modal
                title={editingItem ? "Sửa trường tùy chỉnh" : "Thêm trường tùy chỉnh"}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? "Cập nhật" : "Thêm mới"}
                cancelText="Hủy"
                destroyOnHidden
            >
                <Form form={form} layout="vertical">
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
