import { useEffect, useState } from "react";
import {
    Modal,
    Button,
    Space,
    Form,
    Input,
    InputNumber,
    App,
    Alert,
    Tag,
} from "antd";
import {
    RiseOutlined,
    FallOutlined,
    EditOutlined,
    SendOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    UserOutlined,
    TeamOutlined,
    DollarOutlined,
    FileTextOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    TrophyOutlined,
    SolutionOutlined,
    InfoCircleOutlined,
    CheckOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";

import {
    approveRequisition,
    rejectRequisition,
    requestRequisitionChanges,
    submitRequisition,
} from "../recruitmentApi";

import type {
    ApiMessageResponse,
    JobRequisitionResponse,
} from "../types";

import {
    REQUISITION_STATUS_COLOR,
    REQUISITION_STATUS_LABEL,
} from "../requisitionStatus";

import { useAppSelector } from "../../../app/hooks";
import { DEPARTMENT_ROLES, HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";

import StatusTag from "../../../components/ui/StatusTag";

import {
    WORK_ARRANGEMENT_LABEL,
    REASON_LABEL,
    PRIORITY_LABEL,
} from "../requisitionOptions";

import { COLORS, RADIUS } from "../../../app/theme";

import { formatMoney } from "../../../app/money";
import {
    SectionHeader,
    SectionContainer,
    InfoField,
    TextBlock,
} from "../../../components/ui/sectionKit";

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

/* ============================================================
   MAIN COMPONENT
============================================================ */

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

    const currentUser = useAppSelector(
        (state) => state.auth.user,
    );

    const [rejectModalOpen, setRejectModalOpen] =
        useState(false);

    const [changesModalOpen, setChangesModalOpen] =
        useState(false);

    const [approveModalOpen, setApproveModalOpen] =
        useState(false);

    const [rejectForm] = Form.useForm();
    const [changesForm] = Form.useForm();
    const [approveForm] = Form.useForm();

    const [actionLoading, setActionLoading] =
        useState(false);

    useEffect(() => {
        if (requisition && approveModalOpen) {
            approveForm.setFieldsValue({
                approvedSalaryMin:
                    requisition.expectedSalaryMin,
                approvedSalaryMax:
                    requisition.expectedSalaryMax,
                note: "",
            });
        }
    }, [
        requisition,
        approveModalOpen,
        approveForm,
    ]);

    if (!requisition) return null;

    /* ============================================================
       PERMISSIONS
    ============================================================ */

    const role =
        currentUser?.role as UserRole | undefined;

    const isOwner =
        currentUser?.userId ===
        String(requisition.requesterId) &&
        !!role &&
        DEPARTMENT_ROLES.includes(role);

    const isApprover =
        currentUser?.userId ===
        String(requisition.approverId) &&
        !!role &&
        HR_ROLES.includes(role);

    const canOwnerAct =
        isOwner &&
        (
            requisition.status === "DRAFT" ||
            requisition.status ===
            "CHANGES_REQUESTED"
        );

    const canApproverAct =
        isApprover &&
        requisition.status === "PENDING_APPROVAL";

    /* ============================================================
       ACTIONS
    ============================================================ */

    const handleSubmit = async () => {
        setActionLoading(true);

        try {
            await submitRequisition(requisition.id);

            message.success(
                "Đã gửi yêu cầu đến HR để phê duyệt",
            );

            onChanged();
            onClose();
        } catch (err) {
            const axiosErr =
                err as AxiosError<ApiMessageResponse>;

            message.error(
                axiosErr.response?.data?.message ??
                "Gửi yêu cầu phê duyệt thất bại",
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            const values =
                await approveForm.validateFields();

            if (
                values.approvedSalaryMin != null &&
                values.approvedSalaryMax != null &&
                values.approvedSalaryMin >
                values.approvedSalaryMax
            ) {
                message.error(
                    "Mức lương tối thiểu không được lớn hơn mức lương tối đa",
                );
                return;
            }

            setActionLoading(true);

            await approveRequisition(
                requisition.id,
                values,
            );

            message.success(
                "Đã phê duyệt yêu cầu tuyển dụng",
            );

            setApproveModalOpen(false);

            onChanged();
            onClose();
        } catch (err) {
            const axiosErr =
                err as AxiosError<ApiMessageResponse>;

            if (axiosErr.response?.data?.message) {
                message.error(
                    axiosErr.response.data.message,
                );
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        try {
            const values =
                await rejectForm.validateFields();

            setActionLoading(true);

            await rejectRequisition(
                requisition.id,
                values,
            );

            message.success(
                "Đã từ chối yêu cầu tuyển dụng",
            );

            setRejectModalOpen(false);

            onChanged();
            onClose();
        } catch (err) {
            const axiosErr =
                err as AxiosError<ApiMessageResponse>;

            if (axiosErr.response?.data?.message) {
                message.error(
                    axiosErr.response.data.message,
                );
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestChanges = async () => {
        try {
            const values =
                await changesForm.validateFields();

            setActionLoading(true);

            await requestRequisitionChanges(
                requisition.id,
                values,
            );

            message.success(
                "Đã gửi yêu cầu chỉnh sửa cho phòng ban",
            );

            setChangesModalOpen(false);

            onChanged();
            onClose();
        } catch (err) {
            const axiosErr =
                err as AxiosError<ApiMessageResponse>;

            if (axiosErr.response?.data?.message) {
                message.error(
                    axiosErr.response.data.message,
                );
            }
        } finally {
            setActionLoading(false);
        }
    };

    /* ============================================================
       SALARY CALCULATIONS
    ============================================================ */

    const hasApprovedSalary =
        requisition.status === "APPROVED";

    const expectedAvg =
        requisition.expectedSalaryMin != null &&
            requisition.expectedSalaryMax != null
            ? (
                requisition.expectedSalaryMin +
                requisition.expectedSalaryMax
            ) / 2
            : null;

    const approvedAvg =
        requisition.approvedSalaryMin != null &&
            requisition.approvedSalaryMax != null
            ? (
                requisition.approvedSalaryMin +
                requisition.approvedSalaryMax
            ) / 2
            : null;

    const salaryDelta =
        hasApprovedSalary &&
            expectedAvg != null &&
            approvedAvg != null
            ? approvedAvg - expectedAvg
            : null;

    const textBlocks = [
        {
            label: "Mô tả công việc",
            value: requisition.description,
        },
        {
            label: "Yêu cầu ứng viên",
            value: requisition.requirements,
        },
        {
            label: "Quyền lợi",
            value: requisition.benefits,
        },
        {
            label: "Ghi chú gửi HR",
            value: requisition.note,
        },
    ].filter((item) => item.value);

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <>
            <Modal
                open={open}
                onCancel={onClose}
                width={1100}
                destroyOnHidden
                centered
                title={
                    <div
                        style={{
                            paddingRight: 8,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 4,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: COLORS.textPrimary,
                                }}
                            >
                                {requisition.title}
                            </span>

                            <StatusTag
                                color={
                                    REQUISITION_STATUS_COLOR[
                                    requisition.status
                                    ]
                                }
                                label={
                                    REQUISITION_STATUS_LABEL[
                                    requisition.status
                                    ]
                                }
                            />
                        </div>

                        <div
                            style={{
                                fontSize: 12,
                                color: COLORS.textMuted,
                            }}
                        >
                            Chi tiết yêu cầu tuyển dụng
                        </div>
                    </div>
                }
                styles={{
                    body: {
                        maxHeight: "72vh",
                        overflowY: "auto",
                        padding: "12px",
                        background: "#FAFBFC",
                    },
                    footer: {
                        padding: "12px",
                        borderTop: `1px solid ${COLORS.borderLight}`,
                    },
                }}
                footer={
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                color: COLORS.textMuted,
                            }}
                        >
                            {canOwnerAct &&
                                "Bạn có thể chỉnh sửa hoặc gửi yêu cầu để HR phê duyệt."}

                            {canApproverAct &&
                                "Vui lòng kiểm tra thông tin trước khi phê duyệt."}
                        </div>

                        <Space>
                            {canOwnerAct && (
                                <>
                                    <Button
                                        icon={<EditOutlined />}
                                        onClick={() =>
                                            onEdit(
                                                requisition,
                                            )
                                        }
                                    >
                                        Chỉnh sửa
                                    </Button>

                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        loading={
                                            actionLoading
                                        }
                                        onClick={
                                            handleSubmit
                                        }
                                    >
                                        Gửi HR duyệt
                                    </Button>
                                </>
                            )}

                            {canApproverAct && (
                                <>
                                    <Button
                                        danger
                                        icon={
                                            <CloseCircleOutlined />
                                        }
                                        onClick={() =>
                                            setRejectModalOpen(
                                                true,
                                            )
                                        }
                                    >
                                        Từ chối
                                    </Button>

                                    <Button
                                        icon={
                                            <ExclamationCircleOutlined />
                                        }
                                        onClick={() =>
                                            setChangesModalOpen(
                                                true,
                                            )
                                        }
                                    >
                                        Yêu cầu chỉnh sửa
                                    </Button>

                                    <Button
                                        type="primary"
                                        icon={
                                            <CheckCircleOutlined />
                                        }
                                        onClick={() =>
                                            setApproveModalOpen(
                                                true,
                                            )
                                        }
                                    >
                                        Phê duyệt
                                    </Button>
                                </>
                            )}
                        </Space>
                    </div>
                }
            >
                {/* ========================================================
                    STATUS ALERTS
                ======================================================== */}

                {requisition.status ===
                    "CHANGES_REQUESTED" &&
                    requisition.hrNote && (
                        <Alert
                            type="warning"
                            showIcon
                            message="HR yêu cầu chỉnh sửa"
                            description={
                                requisition.hrNote
                            }
                            style={{
                                marginBottom: 12,
                                borderRadius: RADIUS.md,
                            }}
                        />
                    )}

                {requisition.status ===
                    "REJECTED" && (
                        <Alert
                            type="error"
                            showIcon
                            message="Yêu cầu đã bị từ chối"
                            description={
                                requisition.rejectReason
                            }
                            style={{
                                marginBottom: 12,
                                borderRadius: RADIUS.md,
                            }}
                        />
                    )}

                {requisition.status ===
                    "APPROVED" &&
                    requisition.hrNote && (
                        <Alert
                            type="success"
                            showIcon
                            message="Yêu cầu đã được phê duyệt"
                            description={
                                requisition.hrNote
                            }
                            style={{
                                marginBottom: 12,
                                borderRadius: RADIUS.md,
                            }}
                        />
                    )}

                {/* ========================================================
                    POSITION INFORMATION
                ======================================================== */}

                <SectionContainer>
                    <SectionHeader
                        icon={<SolutionOutlined />}
                        title="Thông tin vị trí"
                        subtitle="Thông tin cơ bản về nhu cầu tuyển dụng"
                    />

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(3, minmax(0, 1fr))",
                            gap: 12,
                        }}
                    >
                        <InfoField
                            icon={<TeamOutlined />}
                            label="Phòng ban"
                            value={
                                departmentMap[
                                requisition.departmentId
                                ]
                            }
                        />

                        <InfoField
                            icon={<TrophyOutlined />}
                            label="Chức vụ"
                            value={
                                jobTitleMap[
                                requisition.jobTitleId
                                ]
                            }
                        />

                        <InfoField
                            label="Số lượng tuyển"
                            value={`${requisition.quantity} vị trí`}
                        />

                        <InfoField
                            label="Cấp bậc"
                            value={
                                requisition.jobLevelId
                                    ? jobLevelMap[
                                    requisition
                                        .jobLevelId
                                    ]
                                    : null
                            }
                        />

                        <InfoField
                            label="Loại hình làm việc"
                            value={
                                requisition.employmentTypeId
                                    ? employmentTypeMap[
                                    requisition
                                        .employmentTypeId
                                    ]
                                    : null
                            }
                        />

                        <InfoField
                            label="Hình thức làm việc"
                            value={
                                requisition.workArrangement
                                    ? WORK_ARRANGEMENT_LABEL[
                                    requisition
                                        .workArrangement
                                    ]
                                    : null
                            }
                        />

                        <InfoField
                            icon={
                                <EnvironmentOutlined />
                            }
                            label="Địa điểm làm việc"
                            value={
                                requisition.workLocationId
                                    ? workLocationMap[
                                    requisition
                                        .workLocationId
                                    ]
                                    : null
                            }
                        />

                        <InfoField
                            label="Kinh nghiệm yêu cầu"
                            value={
                                requisition.experienceRequired
                            }
                        />

                        <InfoField
                            icon={<CalendarOutlined />}
                            label="Ngày cần tuyển"
                            value={
                                requisition.expectedStartDate
                            }
                        />

                        <InfoField
                            label="Lý do tuyển dụng"
                            value={
                                requisition.reason
                                    ? REASON_LABEL[
                                    requisition.reason
                                    ]
                                    : null
                            }
                        />

                        <InfoField
                            label="Mức độ ưu tiên"
                            value={
                                requisition.priority
                                    ? PRIORITY_LABEL[
                                    requisition.priority
                                    ]
                                    : null
                            }
                        />
                    </div>
                </SectionContainer>

                {/* ========================================================
                    SALARY & BUDGET
                ======================================================== */}

                <SectionContainer>
                    <SectionHeader
                        icon={<DollarOutlined />}
                        title="Lương & ngân sách"
                        subtitle="So sánh đề xuất của phòng ban và mức HR phê duyệt"
                    />

                    {requisition.budget != null && (
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: `${COLORS.primary}08`,
                                marginBottom: 12,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 12,
                                    color: COLORS.textMuted,
                                }}
                            >
                                Ngân sách dự kiến
                            </span>

                            <span
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: COLORS.primary,
                                }}
                            >
                                {formatMoney(
                                    requisition.budget,
                                )}
                            </span>
                        </div>
                    )}

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "1fr 80px 1fr",
                            gap: 12,
                            alignItems: "stretch",
                        }}
                    >
                        {/* Department Salary */}

                        <div
                            style={{
                                border: `1px solid ${COLORS.borderLight}`,
                                borderRadius: RADIUS.md,
                                padding: "12px",
                                background: "#FAFBFC",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    color: COLORS.textMuted,
                                    fontWeight: 700,
                                    textTransform:
                                        "uppercase",
                                    letterSpacing: 0.3,
                                    marginBottom: 8,
                                }}
                            >
                                Phòng ban đề xuất
                            </div>

                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color:
                                        COLORS.textPrimary,
                                }}
                            >
                                {formatMoney(
                                    requisition.expectedSalaryMin,
                                )}
                            </div>

                            <div
                                style={{
                                    fontSize: 11,
                                    color: COLORS.textMuted,
                                    margin: "4px 0",
                                }}
                            >
                                đến
                            </div>

                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color:
                                        COLORS.textPrimary,
                                }}
                            >
                                {formatMoney(
                                    requisition.expectedSalaryMax,
                                )}
                            </div>
                        </div>

                        {/* Difference */}

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent:
                                    "center",
                                gap: 8,
                            }}
                        >
                            {salaryDelta != null ? (
                                <>
                                    <div
                                        style={{
                                            fontSize: 20,
                                            color:
                                                salaryDelta >= 0
                                                    ? COLORS.success
                                                    : COLORS.error,
                                        }}
                                    >
                                        {salaryDelta >= 0 ? (
                                            <RiseOutlined />
                                        ) : (
                                            <FallOutlined />
                                        )}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color:
                                                salaryDelta >= 0
                                                    ? COLORS.success
                                                    : COLORS.error,
                                            textAlign: "center",
                                        }}
                                    >
                                        {formatMoney(
                                            Math.abs(
                                                salaryDelta,
                                            ),
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div
                                    style={{
                                        fontSize: 24,
                                        color:
                                            COLORS.textMuted,
                                    }}
                                >
                                    →
                                </div>
                            )}
                        </div>

                        {/* HR Salary */}

                        <div
                            style={{
                                border: `1px solid ${hasApprovedSalary
                                    ? `${COLORS.success}50`
                                    : COLORS.borderLight
                                    }`,
                                borderRadius: RADIUS.md,
                                padding: "12px",
                                background:
                                    hasApprovedSalary
                                        ? "#F0FDF4"
                                        : "#FAFBFC",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent:
                                        "space-between",
                                    marginBottom: 8,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 11,
                                        color:
                                            COLORS.textMuted,
                                        fontWeight: 700,
                                        textTransform:
                                            "uppercase",
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    HR chốt duyệt
                                </span>

                                {hasApprovedSalary && (
                                    <CheckOutlined
                                        style={{
                                            color:
                                                COLORS.success,
                                        }}
                                    />
                                )}
                            </div>

                            {hasApprovedSalary ? (
                                <>
                                    <div
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 700,
                                            color:
                                                COLORS.success,
                                        }}
                                    >
                                        {formatMoney(
                                            requisition.approvedSalaryMin,
                                        )}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 11,
                                            color:
                                                COLORS.textMuted,
                                            margin: "4px 0",
                                        }}
                                    >
                                        đến
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 700,
                                            color:
                                                COLORS.success,
                                        }}
                                    >
                                        {formatMoney(
                                            requisition.approvedSalaryMax,
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div
                                    style={{
                                        color:
                                            COLORS.textMuted,
                                        fontSize: 14,
                                        paddingTop: 12,
                                    }}
                                >
                                    Chưa có mức lương được duyệt
                                </div>
                            )}
                        </div>
                    </div>
                </SectionContainer>

                {/* ========================================================
                    PEOPLE
                ======================================================== */}

                <SectionContainer>
                    <SectionHeader
                        icon={<UserOutlined />}
                        title="Nhân sự liên quan"
                        subtitle="Người tạo và người phụ trách phê duyệt"
                    />

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(2, minmax(0, 1fr))",
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                padding: "12px",
                                border: `1px solid ${COLORS.borderLight}`,
                                borderRadius: RADIUS.md,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    color:
                                        COLORS.textMuted,
                                    marginBottom: 4,
                                }}
                            >
                                NGƯỜI TẠO YÊU CẦU
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontWeight: 600,
                                    color:
                                        COLORS.textPrimary,
                                }}
                            >
                                <UserOutlined
                                    style={{
                                        color:
                                            COLORS.primary,
                                    }}
                                />

                                {requisition.requesterName}
                            </div>
                        </div>

                        <div
                            style={{
                                padding: "12px",
                                border: `1px solid ${COLORS.borderLight}`,
                                borderRadius: RADIUS.md,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    color:
                                        COLORS.textMuted,
                                    marginBottom: 4,
                                }}
                            >
                                NGƯỜI PHÊ DUYỆT
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontWeight: 600,
                                    color:
                                        COLORS.textPrimary,
                                }}
                            >
                                <CheckCircleOutlined
                                    style={{
                                        color:
                                            COLORS.success,
                                    }}
                                />

                                {requisition.approverName ||
                                    "Chưa được phân công"}
                            </div>
                        </div>
                    </div>
                </SectionContainer>

                {/* ========================================================
                    DESCRIPTION + SKILLS
                ======================================================== */}

                {(textBlocks.length > 0 ||
                    (requisition.skillIds &&
                        requisition.skillIds.length > 0)) && (
                    <SectionContainer style={{ marginBottom: 4 }}>
                        <SectionHeader
                            icon={<FileTextOutlined />}
                            title="Thông tin chi tiết"
                            subtitle="Mô tả và các yêu cầu liên quan đến vị trí"
                        />

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(350px, 1fr))",
                                gap: 12,
                            }}
                        >
                            {textBlocks.map((item) => (
                                <TextBlock
                                    key={item.label}
                                    label={item.label}
                                    value={item.value}
                                />
                            ))}

                            {requisition.skillIds &&
                                requisition.skillIds.length > 0 && (
                                    <TextBlock
                                        label="Kỹ năng yêu cầu"
                                        value={
                                            <Space wrap size={[8, 8]}>
                                                {requisition.skillIds.map(
                                                    (id) => (
                                                        <Tag
                                                            key={id}
                                                            style={{
                                                                padding:
                                                                    "5px 10px",
                                                                borderRadius:
                                                                    6,
                                                                fontSize: 12,
                                                                background:
                                                                    `${COLORS.primary}08`,
                                                                border: `1px solid ${COLORS.primary}25`,
                                                                color:
                                                                    COLORS.primary,
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {skillMap[id] ??
                                                                `Skill #${id}`}
                                                        </Tag>
                                                    ),
                                                )}
                                            </Space>
                                        }
                                    />
                                )}
                        </div>
                    </SectionContainer>
                )}
            </Modal>

            {/* ============================================================
                APPROVE MODAL
            ============================================================ */}

            <Modal
                title={
                    <Space>
                        <CheckCircleOutlined
                            style={{
                                color: COLORS.success,
                            }}
                        />

                        Phê duyệt yêu cầu tuyển dụng
                    </Space>
                }
                open={approveModalOpen}
                onOk={handleApprove}
                onCancel={() =>
                    setApproveModalOpen(false)
                }
                confirmLoading={actionLoading}
                okText="Phê duyệt yêu cầu"
                cancelText="Hủy"
            >
                <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    message="Kiểm tra mức lương trước khi phê duyệt"
                    description="HR có thể điều chỉnh mức lương cuối cùng phù hợp với ngân sách và chính sách công ty."
                    style={{
                        marginBottom: 12,
                        borderRadius: RADIUS.md,
                    }}
                />

                <Form
                    form={approveForm}
                    layout="vertical"
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "1fr 1fr",
                            gap: 12,
                        }}
                    >
                        <Form.Item
                            label="Mức lương tối thiểu"
                            name="approvedSalaryMin"
                        >
                            <InputNumber
                                style={{
                                    width: "100%",
                                }}
                                min={0}
                                addonAfter="đ"
                                placeholder="Nhập mức lương"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Mức lương tối đa"
                            name="approvedSalaryMax"
                        >
                            <InputNumber
                                style={{
                                    width: "100%",
                                }}
                                min={0}
                                addonAfter="đ"
                                placeholder="Nhập mức lương"
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Ghi chú của HR"
                        name="note"
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="Ví dụ: Đã điều chỉnh mức lương phù hợp với ngân sách hiện tại..."
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* ============================================================
                REQUEST CHANGES MODAL
            ============================================================ */}

            <Modal
                title={
                    <Space>
                        <ExclamationCircleOutlined
                            style={{
                                color: "#D97706",
                            }}
                        />

                        Yêu cầu chỉnh sửa
                    </Space>
                }
                open={changesModalOpen}
                onOk={handleRequestChanges}
                onCancel={() =>
                    setChangesModalOpen(false)
                }
                confirmLoading={actionLoading}
                okText="Gửi yêu cầu"
                cancelText="Hủy"
            >
                <Alert
                    type="warning"
                    showIcon
                    message="Yêu cầu sẽ được gửi lại cho phòng ban"
                    description="Hãy mô tả rõ những nội dung cần được điều chỉnh để người tạo có thể xử lý nhanh hơn."
                    style={{
                        marginBottom: 12,
                        borderRadius: RADIUS.md,
                    }}
                />

                <Form
                    form={changesForm}
                    layout="vertical"
                >
                    <Form.Item
                        name="note"
                        label="Nội dung cần chỉnh sửa"
                        rules={[
                            {
                                required: true,
                                message:
                                    "Vui lòng nhập nội dung cần chỉnh sửa",
                            },
                        ]}
                    >
                        <Input.TextArea
                            rows={5}
                            placeholder="Ví dụ: Mức lương đề xuất hiện tại vượt ngân sách. Vui lòng điều chỉnh lại khoảng lương phù hợp..."
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* ============================================================
                REJECT MODAL
            ============================================================ */}

            <Modal
                title={
                    <Space>
                        <CloseCircleOutlined
                            style={{
                                color: COLORS.error,
                            }}
                        />

                        Từ chối yêu cầu tuyển dụng
                    </Space>
                }
                open={rejectModalOpen}
                onOk={handleReject}
                onCancel={() =>
                    setRejectModalOpen(false)
                }
                confirmLoading={actionLoading}
                okText="Xác nhận từ chối"
                cancelText="Hủy"
                okButtonProps={{
                    danger: true,
                }}
            >
                <Alert
                    type="error"
                    showIcon
                    message="Xác nhận từ chối yêu cầu"
                    description="Vui lòng cung cấp lý do cụ thể để phòng ban hiểu và có thể điều chỉnh hoặc tạo yêu cầu mới."
                    style={{
                        marginBottom: 12,
                        borderRadius: RADIUS.md,
                    }}
                />

                <Form
                    form={rejectForm}
                    layout="vertical"
                >
                    <Form.Item
                        name="reason"
                        label="Lý do từ chối"
                        rules={[
                            {
                                required: true,
                                message:
                                    "Vui lòng nhập lý do từ chối",
                            },
                        ]}
                    >
                        <Input.TextArea
                            rows={5}
                            placeholder="Nhập lý do từ chối yêu cầu..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}