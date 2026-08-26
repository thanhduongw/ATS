import { useEffect, useState } from "react";
import { Modal, Button, Space, Form, Input, InputNumber, App, Alert, Divider, Tag } from "antd";
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
import { WORK_ARRANGEMENT_LABEL, REASON_LABEL, PRIORITY_LABEL } from "../requisitionOptions";
import { COLORS, RADIUS } from "../../../app/theme";

interface Props {
    open: boolean;
    requisition: JobRequisitionResponse | null;
    departmentMap: Record<number, string>;
    jobTitleMap: Record<number, string>;
    jobLevelMap: Record<number, string>;
    skillMap: Record<number, string>;
    employmentTypeMap: Record<number, string>;
    workLocationMap: Record<number, string>;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (item: JobRequisitionResponse) => void;
}

function formatMoney(value: number | null | undefined) {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>{value ?? "—"}</div>
        </div>
    );
}

function TextBlock({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div
            style={{
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: RADIUS.md,
                padding: "10px 12px",
                background: "#FAFBFC",
                minHeight: 60,
            }}
        >
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 13, color: COLORS.textPrimary, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>
                {value || "—"}
            </div>
        </div>
    );
}

export default function RequisitionDetailModal({
    open,
    requisition,
    departmentMap,
    jobTitleMap,
    jobLevelMap,
    skillMap,
    employmentTypeMap,
    workLocationMap,
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
        <Modal
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span>{requisition.title}</span>
                    <StatusTag color={REQUISITION_STATUS_COLOR[requisition.status]} label={REQUISITION_STATUS_LABEL[requisition.status]} />
                </div>
            }
            open={open}
            onCancel={onClose}
            width={880}
            destroyOnHidden
            styles={{ body: { maxHeight: "72vh", overflowY: "auto", paddingRight: 4 } }}
            footer={
                <Space wrap>
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
                    <Button onClick={onClose}>Đóng</Button>
                </Space>
            }
        >
            {requisition.status === "CHANGES_REQUESTED" && requisition.hrNote && (
                <Alert
                    type="warning"
                    showIcon
                    message="HR yêu cầu chỉnh sửa lại"
                    description={requisition.hrNote}
                    style={{ marginBottom: 16 }}
                />
            )}
            {requisition.status === "REJECTED" && (
                <Alert type="error" showIcon message="Lý do từ chối" description={requisition.rejectReason} style={{ marginBottom: 16 }} />
            )}
            {requisition.status === "APPROVED" && requisition.hrNote && (
                <Alert type="info" showIcon message="Ghi chú của HR" description={requisition.hrNote} style={{ marginBottom: 16 }} />
            )}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    rowGap: 14,
                    columnGap: 16,
                    padding: "14px 16px",
                    background: "#FAFBFC",
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: RADIUS.md,
                    marginBottom: 16,
                }}
            >
                <InfoField label="Phòng ban" value={departmentMap[requisition.departmentId]} />
                <InfoField label="Chức vụ" value={jobTitleMap[requisition.jobTitleId]} />
                <InfoField label="Cấp bậc" value={requisition.jobLevelId ? jobLevelMap[requisition.jobLevelId] : null} />
                <InfoField label="Số lượng" value={requisition.quantity} />
                <InfoField label="Loại hình làm việc" value={requisition.employmentTypeId ? employmentTypeMap[requisition.employmentTypeId] : null} />
                <InfoField label="Hình thức làm việc" value={requisition.workArrangement ? WORK_ARRANGEMENT_LABEL[requisition.workArrangement] : null} />
                <InfoField label="Địa điểm làm việc" value={requisition.workLocationId ? workLocationMap[requisition.workLocationId] : null} />
                <InfoField label="Kinh nghiệm yêu cầu" value={requisition.experienceRequired} />
                <InfoField label="Ngân sách" value={requisition.budget} />
                <InfoField label="Ngày cần tuyển" value={requisition.expectedStartDate} />
                <InfoField label="Lý do tuyển dụng" value={requisition.reason ? REASON_LABEL[requisition.reason] : null} />
                <InfoField label="Mức độ ưu tiên" value={requisition.priority ? PRIORITY_LABEL[requisition.priority] : null} />
                <InfoField label="Người tạo (phòng ban)" value={requisition.requesterName} />
                <InfoField label="Người duyệt (HR)" value={requisition.approverName} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <TextBlock label="Mô tả công việc" value={requisition.description} />
                <TextBlock label="Yêu cầu ứng viên" value={requisition.requirements} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <TextBlock label="Quyền lợi" value={requisition.benefits} />
                <TextBlock label="Ghi chú gửi HR" value={requisition.note} />
            </div>

            {requisition.skillIds && requisition.skillIds.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6, fontWeight: 600 }}>Kỹ năng yêu cầu</div>
                    <Space wrap size={4}>
                        {requisition.skillIds.map((id) => (
                            <Tag key={id}>{skillMap[id] ?? `#${id}`}</Tag>
                        ))}
                    </Space>
                </div>
            )}

            <Divider titlePlacement="start" plain style={{ marginTop: 0 }}>
                So sánh mức lương
            </Divider>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <InfoField
                    label="Phòng ban đề xuất"
                    value={`${formatMoney(requisition.expectedSalaryMin)} — ${formatMoney(requisition.expectedSalaryMax)}`}
                />
                <InfoField
                    label="HR chốt duyệt"
                    value={
                        hasApprovedSalary ? (
                            <span style={{ color: "#0E7A5F", fontWeight: 600 }}>
                                {formatMoney(requisition.approvedSalaryMin)} — {formatMoney(requisition.approvedSalaryMax)}
                            </span>
                        ) : (
                            "— (chưa duyệt)"
                        )
                    }
                />
            </div>

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
                    message="Bạn có thể chốt lại mức lương khác với đề xuất của phòng ban trước khi duyệt."
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
        </Modal>
    );
}
