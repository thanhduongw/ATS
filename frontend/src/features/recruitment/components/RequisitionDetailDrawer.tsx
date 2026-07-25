import { useState } from "react";
import { Drawer, Descriptions, Tag, Button, Space, Modal, Form, Input, message } from "antd";
import type { AxiosError } from "axios";
import { approveRequisition, rejectRequisition, submitRequisition } from "../recruitmentApi";
import type { ApiMessageResponse, JobRequisitionResponse, RequisitionStatus } from "../types";
import { useAppSelector } from "../../../app/hooks";

interface Props {
    open: boolean;
    requisition: JobRequisitionResponse | null;
    departmentMap: Record<number, string>;
    jobTitleMap: Record<number, string>;
    jobLevelMap: Record<number, string>;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (item: JobRequisitionResponse) => void;
}

const STATUS_COLOR: Record<RequisitionStatus, string> = {
    DRAFT: "default",
    PENDING_APPROVAL: "gold",
    APPROVED: "green",
    REJECTED: "red",
};

const STATUS_LABEL: Record<RequisitionStatus, string> = {
    DRAFT: "Bản nháp",
    PENDING_APPROVAL: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
};

export default function RequisitionDetailDrawer({
    open,
    requisition,
    departmentMap,
    jobTitleMap,
    jobLevelMap,
    onClose,
    onChanged,
    onEdit,
}: Props) {
    const currentUser = useAppSelector((state) => state.auth.user);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectForm] = Form.useForm();
    const [actionLoading, setActionLoading] = useState(false);

    if (!requisition) return null;

    const isOwner = currentUser?.userId === String(requisition.requesterId);
    const isApprover = currentUser?.userId === String(requisition.approverId);

    const handleSubmit = async () => {
        setActionLoading(true);
        try {
            await submitRequisition(requisition.id);
            message.success("Đã gửi duyệt");
            onChanged();
            onClose();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Gửi duyệt thất bại");
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await approveRequisition(requisition.id);
            message.success("Đã phê duyệt");
            onChanged();
            onClose();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Phê duyệt thất bại");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        try {
            const values = await rejectForm.validateFields();
            setActionLoading(true);
            await rejectRequisition(requisition.id, values);
            message.success("Đã từ chối yêu cầu");
            setRejectModalOpen(false);
            onChanged();
            onClose();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            if (axiosErr.response?.data?.message) {
                message.error(axiosErr.response.data.message);
            }
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <Drawer title={requisition.title} open={open} onClose={onClose} width={480}>
            <Tag color={STATUS_COLOR[requisition.status]} style={{ marginBottom: 16 }}>
                {STATUS_LABEL[requisition.status]}
            </Tag>

            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Phòng ban">{departmentMap[requisition.departmentId] ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Chức vụ">{jobTitleMap[requisition.jobTitleId] ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Cấp bậc">
                    {requisition.jobLevelId ? jobLevelMap[requisition.jobLevelId] ?? "—" : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Số lượng">{requisition.quantity}</Descriptions.Item>
                <Descriptions.Item label="Ngân sách">{requisition.budget ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Lương đề xuất">
                    {requisition.expectedSalaryMin ?? "—"} - {requisition.expectedSalaryMax ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày cần tuyển">{requisition.expectedStartDate ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Mô tả">{requisition.description ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Người tạo">{requisition.requesterName}</Descriptions.Item>
                <Descriptions.Item label="Người duyệt">{requisition.approverName}</Descriptions.Item>
                {requisition.status === "REJECTED" && (
                    <Descriptions.Item label="Lý do từ chối">{requisition.rejectReason}</Descriptions.Item>
                )}
            </Descriptions>

            <Space style={{ marginTop: 24 }}>
                {isOwner && requisition.status === "DRAFT" && (
                    <>
                        <Button onClick={() => onEdit(requisition)}>Sửa</Button>
                        <Button type="primary" loading={actionLoading} onClick={handleSubmit}>
                            Gửi duyệt
                        </Button>
                    </>
                )}
                {isApprover && requisition.status === "PENDING_APPROVAL" && (
                    <>
                        <Button type="primary" loading={actionLoading} onClick={handleApprove}>
                            Phê duyệt
                        </Button>
                        <Button danger onClick={() => setRejectModalOpen(true)}>
                            Từ chối
                        </Button>
                    </>
                )}
            </Space>

            <Modal
                title="Từ chối yêu cầu tuyển dụng"
                open={rejectModalOpen}
                onOk={handleReject}
                onCancel={() => setRejectModalOpen(false)}
                confirmLoading={actionLoading}
                okText="Từ chối"
                cancelText="Hủy"
            >
                <Form form={rejectForm} layout="vertical">
                    <Form.Item
                        name="reason"
                        label="Lý do từ chối"
                        rules={[{ required: true, message: "Vui lòng nhập lý do từ chối" }]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </Drawer>
    );
}