import { useEffect, useState } from "react";
import { Drawer, Descriptions, Button, Space, Modal, Form, Input, InputNumber, App, Alert, Divider, Tag } from "antd";
import type { AxiosError } from "axios";
import {
    approveRequisition,
    rejectRequisition,
    requestRequisitionChanges,
    submitRequisition,
} from "../recruitmentApi";
import type { ApiMessageResponse, JobRequisitionResponse } from "../types";
import { REQUISITION_STATUS_COLOR, REQUISITION_STATUS_LABEL } from "../requisitionStatus";
import { useAppSelector } from "../../../app/hooks";
import { DEPARTMENT_ROLES, HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import StatusTag from "../../../components/ui/StatusTag";

interface Props {
    open: boolean;
    requisition: JobRequisitionResponse | null;
    departmentMap: Record<number, string>;
    jobTitleMap: Record<number, string>;
    jobLevelMap: Record<number, string>;
    skillMap: Record<number, string>;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (item: JobRequisitionResponse) => void;
}

function formatMoney(value: number | null | undefined) {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

export default function RequisitionDetailDrawer({
    open,
    requisition,
    departmentMap,
    jobTitleMap,
    jobLevelMap,
    skillMap,
    onClose,
    onChanged,
    onEdit,
}: Props) {
    const { message } = App.useApp();
    const currentUser = useAppSelector((state) => state.auth.user);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [changesModalOpen, setChangesModalOpen] = useState(false);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [rejectForm] = Form.useForm();
    const [changesForm] = Form.useForm();
    const [approveForm] = Form.useForm();
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (requisition && approveModalOpen) {
            approveForm.setFieldsValue({
                approvedSalaryMin: requisition.expectedSalaryMin,
                approvedSalaryMax: requisition.expectedSalaryMax,
                note: "",
            });
        }
    }, [requisition, approveModalOpen, approveForm]);

    if (!requisition) return null;

    const role = currentUser?.role as UserRole | undefined;

    const isOwner =
        currentUser?.userId === String(requisition.requesterId) &&
        !!role &&
        DEPARTMENT_ROLES.includes(role);

    const isApprover =
        currentUser?.userId === String(requisition.approverId) &&
        !!role &&
        HR_ROLES.includes(role);

    const handleSubmit = async () => {
        setActionLoading(true);
        try {
            await submitRequisition(requisition.id);
            message.success("Đã gửi HR duyệt");
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
        try {
            const values = await approveForm.validateFields();
            setActionLoading(true);
            await approveRequisition(requisition.id, values);
            message.success("Đã phê duyệt yêu cầu tuyển dụng");
            setApproveModalOpen(false);
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

    const handleRequestChanges = async () => {
        try {
            const values = await changesForm.validateFields();
            setActionLoading(true);
            await requestRequisitionChanges(requisition.id, values);
            message.success("Đã gửi yêu cầu chỉnh sửa cho phòng ban");
            setChangesModalOpen(false);
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

    const hasApprovedSalary = requisition.status === "APPROVED";

    return (
        <Drawer title={requisition.title} open={open} onClose={onClose} width={520}>
            <StatusTag color={REQUISITION_STATUS_COLOR[requisition.status]} label={REQUISITION_STATUS_LABEL[requisition.status]} style={{ marginBottom: 16 }} />

            {requisition.status === "CHANGES_REQUESTED" && requisition.hrNote && (
                <Alert
                    type="warning"
                    showIcon
                    title="HR yêu cầu chỉnh sửa lại"
                    description={requisition.hrNote}
                    style={{ marginBottom: 16 }}
                />
            )}

            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Phòng ban">{departmentMap[requisition.departmentId] ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Chức vụ">{jobTitleMap[requisition.jobTitleId] ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Cấp bậc">
                    {requisition.jobLevelId ? jobLevelMap[requisition.jobLevelId] ?? "—" : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Số lượng">{requisition.quantity}</Descriptions.Item>
                <Descriptions.Item label="Ngân sách">{requisition.budget ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Ngày cần tuyển">{requisition.expectedStartDate ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Mô tả công việc">{requisition.description ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Yêu cầu ứng viên">{requisition.requirements ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Quyền lợi">{requisition.benefits ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Kỹ năng yêu cầu">
                    {requisition.skillIds && requisition.skillIds.length > 0 ? (
                        <Space wrap>
                            {requisition.skillIds.map((id) => (
                                <Tag key={id}>{skillMap[id] ?? `#${id}`}</Tag>
                            ))}
                        </Space>
                    ) : (
                        "—"
                    )}
                </Descriptions.Item>
                <Descriptions.Item label="Người tạo (phòng ban)">{requisition.requesterName}</Descriptions.Item>
                <Descriptions.Item label="Người duyệt (HR)">{requisition.approverName}</Descriptions.Item>
                {requisition.status === "REJECTED" && (
                    <Descriptions.Item label="Lý do từ chối">{requisition.rejectReason}</Descriptions.Item>
                )}
                {requisition.status === "APPROVED" && requisition.hrNote && (
                    <Descriptions.Item label="Ghi chú của HR">{requisition.hrNote}</Descriptions.Item>
                )}
            </Descriptions>

            <Divider titlePlacement="start" plain>
                So sánh mức lương
            </Divider>
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Phòng ban đề xuất">
                    {formatMoney(requisition.expectedSalaryMin)} — {formatMoney(requisition.expectedSalaryMax)}
                </Descriptions.Item>
                <Descriptions.Item label="HR chốt duyệt">
                    {hasApprovedSalary ? (
                        <span style={{ color: "#0E7A5F", fontWeight: 600 }}>
                            {formatMoney(requisition.approvedSalaryMin)} — {formatMoney(requisition.approvedSalaryMax)}
                        </span>
                    ) : (
                        "— (chưa duyệt)"
                    )}
                </Descriptions.Item>
            </Descriptions>

            <Space style={{ marginTop: 24 }} wrap>
                {isOwner && (requisition.status === "DRAFT" || requisition.status === "CHANGES_REQUESTED") && (
                    <>
                        <Button onClick={() => onEdit(requisition)}>Sửa</Button>
                        <Button type="primary" loading={actionLoading} onClick={handleSubmit}>
                            Gửi HR duyệt
                        </Button>
                    </>
                )}
                {isApprover && requisition.status === "PENDING_APPROVAL" && (
                    <>
                        <Button type="primary" onClick={() => setApproveModalOpen(true)}>
                            Phê duyệt
                        </Button>
                        <Button onClick={() => setChangesModalOpen(true)}>Yêu cầu chỉnh sửa</Button>
                        <Button danger onClick={() => setRejectModalOpen(true)}>
                            Từ chối
                        </Button>
                    </>
                )}
            </Space>

            <Modal
                title="Phê duyệt yêu cầu tuyển dụng"
                open={approveModalOpen}
                onOk={handleApprove}
                onCancel={() => setApproveModalOpen(false)}
                confirmLoading={actionLoading}
                okText="Phê duyệt"
                cancelText="Hủy"
            >
                <Alert
                    type="info"
                    showIcon
                    title="Bạn có thể chốt lại mức lương khác với đề xuất của phòng ban trước khi duyệt."
                    style={{ marginBottom: 16 }}
                />
                <Form form={approveForm} layout="vertical">
                    <div style={{ display: "flex", gap: 16 }}>
                        <Form.Item label="Lương chốt duyệt từ" name="approvedSalaryMin" style={{ flex: 1 }}>
                            <InputNumber style={{ width: "100%" }} min={0} placeholder={String(requisition.expectedSalaryMin ?? "")} />
                        </Form.Item>
                        <Form.Item label="Lương chốt duyệt đến" name="approvedSalaryMax" style={{ flex: 1 }}>
                            <InputNumber style={{ width: "100%" }} min={0} placeholder={String(requisition.expectedSalaryMax ?? "")} />
                        </Form.Item>
                    </div>
                    <Form.Item label="Ghi chú " name="note">
                        <Input.TextArea rows={2} placeholder="Ví dụ: duyệt theo ngân sách quý này" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Yêu cầu phòng ban chỉnh sửa lại"
                open={changesModalOpen}
                onOk={handleRequestChanges}
                onCancel={() => setChangesModalOpen(false)}
                confirmLoading={actionLoading}
                okText="Gửi yêu cầu chỉnh sửa"
                cancelText="Hủy"
            >
                <Form form={changesForm} layout="vertical">
                    <Form.Item
                        name="note"
                        label="Nội dung cần chỉnh sửa"
                        rules={[{ required: true, message: "Vui lòng nhập nội dung cần chỉnh sửa" }]}
                    >
                        <Input.TextArea rows={3} placeholder="Ví dụ: mức lương đề xuất vượt ngân sách, vui lòng điều chỉnh lại" />
                    </Form.Item>
                </Form>
            </Modal>

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