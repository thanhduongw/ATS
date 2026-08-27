import {
    Modal,
    Button,
    Space,
    Tag,
} from "antd";
import {
    EditOutlined,
    FileSearchOutlined,
    SolutionOutlined,
    DollarOutlined,
    FileTextOutlined,
    TrophyOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";

import type { JobPostingResponse } from "../types";
import { POSTING_STATUS, statusMeta } from "../../../app/statusLabels";
import { WORK_ARRANGEMENT_LABEL } from "../requisitionOptions";
import { COLORS, RADIUS } from "../../../app/theme";
import StatusTag from "../../../components/ui/StatusTag";
import { formatSalaryRange } from "../../../app/money";
import { SectionHeader, SectionContainer, InfoField, TextBlock } from "../../../components/ui/sectionKit";

interface Props {
    open: boolean;
    posting: JobPostingResponse | null;
    employmentTypeMap: Record<number, string>;
    workLocationMap: Record<number, string>;
    pipelineMap: Record<number, string>;
    skillMap: Record<number, string>;
    canManage: boolean;
    onClose: () => void;
    onViewRequisition: (requisitionId: number) => void;
    onEdit: (item: JobPostingResponse) => void;
}

export default function PostingDetailModal({
    open,
    posting,
    employmentTypeMap,
    workLocationMap,
    pipelineMap,
    skillMap,
    canManage,
    onClose,
    onViewRequisition,
    onEdit,
}: Props) {
    if (!posting) return null;

    const statusMetaValue = statusMeta(POSTING_STATUS, posting.status);

    const salaryRange = formatSalaryRange(posting.salaryMin, posting.salaryMax);

    const textBlocks = [
        { label: "Mô tả công việc", value: posting.description },
        { label: "Yêu cầu ứng viên", value: posting.requirements },
        { label: "Quyền lợi", value: posting.benefits },
    ].filter((item) => item.value);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={1100}
            destroyOnHidden
            centered
            title={
                <div style={{ paddingRight: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
                            {posting.title}
                        </span>
                        <StatusTag color={statusMetaValue.color} label={statusMetaValue.label} />
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                        Chi tiết tin tuyển dụng
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
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                    <Space>
                        <Button
                            icon={<FileSearchOutlined />}
                            onClick={() => onViewRequisition(posting.requisitionId)}
                        >
                            Xem yêu cầu gốc
                        </Button>
                        {canManage && (
                            <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(posting)}>
                                Sửa tin
                            </Button>
                        )}
                    </Space>
                </div>
            }
        >
            <SectionContainer>
                <SectionHeader
                    icon={<SolutionOutlined />}
                    title="Thông tin tin tuyển dụng"
                    subtitle="Loại hình, địa điểm và quy trình tuyển dụng"
                />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <InfoField label="Loại hình làm việc" value={employmentTypeMap[posting.employmentTypeId]} />
                    <InfoField
                        icon={<EnvironmentOutlined />}
                        label="Địa điểm làm việc"
                        value={workLocationMap[posting.workLocationId]}
                    />
                    <InfoField
                        label="Hình thức làm việc"
                        value={posting.workArrangement ? WORK_ARRANGEMENT_LABEL[posting.workArrangement] : null}
                    />
                    <InfoField
                        icon={<ClockCircleOutlined />}
                        label="Kinh nghiệm yêu cầu"
                        value={posting.experienceRequired}
                    />
                    <InfoField label="Quy trình tuyển dụng" value={pipelineMap[posting.pipelineId]} />
                </div>
            </SectionContainer>

            <SectionContainer>
                <SectionHeader icon={<DollarOutlined />} title="Mức lương" subtitle="Khoảng lương hiển thị công khai trên tin tuyển dụng" />
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: RADIUS.md,
                        background: `${COLORS.primary}08`,
                    }}
                >
                    <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>{salaryRange}</span>
                </div>
            </SectionContainer>

            {textBlocks.length > 0 && (
                <SectionContainer>
                    <SectionHeader
                        icon={<FileTextOutlined />}
                        title="Mô tả & yêu cầu"
                        subtitle="Nội dung đầy đủ của tin tuyển dụng"
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 12 }}>
                        {textBlocks.map((item) => (
                            <TextBlock key={item.label} label={item.label} value={item.value} />
                        ))}
                    </div>
                </SectionContainer>
            )}

            {posting.skillIds && posting.skillIds.length > 0 && (
                <SectionContainer style={{ marginBottom: 4 }}>
                    <SectionHeader
                        icon={<TrophyOutlined />}
                        title="Kỹ năng yêu cầu"
                        subtitle={`${posting.skillIds.length} kỹ năng được yêu cầu`}
                    />
                    <Space wrap size={[8, 8]}>
                        {posting.skillIds.map((id) => (
                            <Tag
                                key={id}
                                style={{
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    background: `${COLORS.primary}08`,
                                    border: `1px solid ${COLORS.primary}25`,
                                    color: COLORS.primary,
                                    fontWeight: 500,
                                }}
                            >
                                {skillMap[id] ?? `Skill #${id}`}
                            </Tag>
                        ))}
                    </Space>
                </SectionContainer>
            )}
        </Modal>
    );
}
