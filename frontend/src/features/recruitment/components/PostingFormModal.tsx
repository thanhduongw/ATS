import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, InputNumber, Select, Button, Alert, App } from "antd";
import {
    LinkOutlined,
    FileTextOutlined,
    DollarCircleOutlined,
    BulbOutlined,
    GiftOutlined,
    FileAddOutlined,
    EditOutlined,
    ClockCircleOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import { postingSchema, type PostingFormValues } from "../schemas/postingSchema";
import { createPosting, updatePosting, getRequisitions } from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem, PipelineResponse } from "../../masterdata/types";
import SkillMultiSelect from "../../masterdata/components/SkillMultiSelect";
import type {
    ApiMessageResponse,
    JobPostingResponse,
    JobRequisitionResponse,
    RequisitionPriority,
} from "../types";
import { COLORS, RADIUS } from "../../../app/theme";
import { WORK_ARRANGEMENT_OPTIONS, PRIORITY_LABEL } from "../requisitionOptions";

interface Props {
    open: boolean;
    editingItem: JobPostingResponse | null;
    onClose: () => void;
    onSuccess: () => void;
}

const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 20,
};

const span2Style: React.CSSProperties = { gridColumn: "1 / -1" };

function Section({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: RADIUS.lg,
                padding: "18px 20px 6px",
                marginBottom: 20,
                background: "#FCFDFD",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "rgba(14, 122, 95, 0.1)",
                        color: COLORS.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </span>
                <span style={{ fontWeight: 600, fontSize: 15, color: COLORS.textPrimary }}>{title}</span>
            </div>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>{value ?? "—"}</div>
        </div>
    );
}

const PRIORITY_STYLE: Record<RequisitionPriority, { color: string; bg: string }> = {
    NORMAL: { color: COLORS.textSecondary, bg: COLORS.borderLight },
    HIGH: { color: COLORS.warning, bg: "#FEF3C7" },
    URGENT: { color: COLORS.error, bg: "#FEE2E2" },
};

function PriorityBadge({ priority }: { priority: RequisitionPriority | null }) {
    if (!priority) return <>—</>;
    const s = PRIORITY_STYLE[priority];
    return (
        <span
            style={{
                display: "inline-block",
                padding: "1px 8px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: s.color,
                background: s.bg,
            }}
        >
            {PRIORITY_LABEL[priority]}
        </span>
    );
}

const moneyFormatter = (value: number | string | undefined) =>
    value || value === 0 ? new Intl.NumberFormat("vi-VN").format(Number(value)) : "";
const moneyParser = (value: string | undefined) => (value ? Number(value.replace(/\D/g, "")) : 0);

const fmtSalaryRange = (min?: number | null, max?: number | null) => {
    if (!min && !max) return "Thỏa thuận";
    const f = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
    if (min && max) return `${f(min)} – ${f(max)} VNĐ`;
    return `${f((min ?? max) as number)} VNĐ`;
};

export default function PostingFormModal({ open, editingItem, onClose, onSuccess }: Props) {
    const { message } = App.useApp();
    const [approvedRequisitions, setApprovedRequisitions] = useState<JobRequisitionResponse[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [jobTitles, setJobTitles] = useState<CatalogItem[]>([]);
    const [jobLevels, setJobLevels] = useState<CatalogItem[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [pipelines, setPipelines] = useState<PipelineResponse[]>([]);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<PostingFormValues>({
        resolver: zodResolver(postingSchema),
    });

    const selectedRequisitionId = watch("requisitionId");

    useEffect(() => {
        if (!open) return;
        Promise.all([
            getRequisitions(),
            getCatalogItems("/masterdata/departments"),
            getCatalogItems("/masterdata/job-titles"),
            getCatalogItems("/masterdata/job-levels"),
            getCatalogItems("/masterdata/employment-types"),
            getCatalogItems("/masterdata/work-locations"),
            getPipelines(),
        ]).then(([reqRes, deptRes, titleRes, levelRes, empRes, locRes, pipeRes]) => {
            setApprovedRequisitions(reqRes.data.content.filter((r) => r.status === "APPROVED"));
            setDepartments(deptRes.data);
            setJobTitles(titleRes.data);
            setJobLevels(levelRes.data);
            setEmploymentTypes(empRes.data);
            setWorkLocations(locRes.data);
            setPipelines(pipeRes.data.filter((p) => p.active));
        });
    }, [open]);

    useEffect(() => {
        if (editingItem) {
            reset({
                requisitionId: editingItem.requisitionId,
                title: editingItem.title,
                employmentTypeId: editingItem.employmentTypeId,
                workLocationId: editingItem.workLocationId,
                workArrangement: editingItem.workArrangement ?? undefined,
                experienceRequired: editingItem.experienceRequired,
                pipelineId: editingItem.pipelineId,
                salaryMin: editingItem.salaryMin,
                salaryMax: editingItem.salaryMax,
                description: editingItem.description,
                requirements: editingItem.requirements,
                benefits: editingItem.benefits,
                skillIds: editingItem.skillIds ?? [],
            });
        } else {
            reset({
                requisitionId: undefined,
                title: "",
                employmentTypeId: undefined,
                workLocationId: undefined,
                workArrangement: undefined,
                experienceRequired: "",
                pipelineId: undefined,
                salaryMin: undefined,
                salaryMax: undefined,
                description: "",
                requirements: "",
                benefits: "",
                skillIds: [],
            });
        }
    }, [editingItem, open, reset]);

    // Chỉ prefill khi TẠO MỚI — không đè dữ liệu khi đang sửa tin
    useEffect(() => {
        if (editingItem) return;
        if (!selectedRequisitionId) return;
        const req = approvedRequisitions.find((r) => r.id === selectedRequisitionId);
        if (!req) return;

        setValue("title", req.title);

        const min = req.approvedSalaryMin ?? req.expectedSalaryMin ?? null;
        const max = req.approvedSalaryMax ?? req.expectedSalaryMax ?? null;
        setValue("salaryMin", min);
        setValue("salaryMax", max);

        if (req.employmentTypeId) {
            setValue("employmentTypeId", req.employmentTypeId);
        }
        if (req.workLocationId) {
            setValue("workLocationId", req.workLocationId);
        }
        if (req.workArrangement) {
            setValue("workArrangement", req.workArrangement);
        }
        if (req.experienceRequired) {
            setValue("experienceRequired", req.experienceRequired);
        }
        if (req.description) {
            setValue("description", req.description);
        }
        if (req.requirements) {
            setValue("requirements", req.requirements);
        }
        if (req.skillIds && req.skillIds.length > 0) {
            setValue("skillIds", req.skillIds);
        }
    }, [selectedRequisitionId, approvedRequisitions, editingItem, setValue]);

    const selectedReq = useMemo(
        () => approvedRequisitions.find((r) => r.id === selectedRequisitionId) ?? null,
        [approvedRequisitions, selectedRequisitionId],
    );

    const nameOf = (list: CatalogItem[], id: number | null | undefined) =>
        (list.find((i) => i.id === id)?.name as string | undefined) ?? "—";

    const onSubmit = async (data: PostingFormValues) => {
        setSaving(true);
        try {
            if (editingItem) {
                const { requisitionId: _requisitionId, ...updateData } = data;
                await updatePosting(editingItem.id, updateData);
                message.success("Cập nhật thành công");
            } else {
                await createPosting(data);
                message.success("Tạo tin tuyển dụng thành công");
            }
            onSuccess();
            onClose();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Thao tác thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: RADIUS.md,
                            background: "linear-gradient(135deg, #0E7A5F 0%, #10B981 100%)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            flexShrink: 0,
                        }}
                    >
                        {editingItem ? <EditOutlined /> : <FileAddOutlined />}
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                            {editingItem ? "Sửa tin tuyển dụng" : "Tạo tin tuyển dụng"}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 400, color: COLORS.textSecondary, marginTop: 2 }}>
                            Đăng tin công khai từ yêu cầu tuyển dụng đã được HR phê duyệt
                        </div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onClose}
            width={800}
            destroyOnHidden
            footer={[
                <Button key="cancel" onClick={onClose} disabled={saving}>
                    Hủy
                </Button>,
                <Button key="submit" type="primary" onClick={handleSubmit(onSubmit)} loading={saving}>
                    {editingItem ? "Cập nhật" : "Đăng tin"}
                </Button>,
            ]}
        >
            {editingItem?.pipelineLocked && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: RADIUS.md }}
                    message="Tin tuyển dụng này đã có ứng viên nộp hồ sơ nên không thể đổi Quy trình tuyển dụng."
                />
            )}
            {!editingItem && approvedRequisitions.length === 0 && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: RADIUS.md }}
                    message="Hiện chưa có yêu cầu tuyển dụng nào được HR phê duyệt để đăng tin."
                />
            )}
            {/* {!editingItem && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: RADIUS.md }}
                    message="Chỉ đăng tin từ yêu cầu đã được HR phê duyệt. Các thông tin sẽ được điền sẵn theo yêu cầu, bạn có thể chỉnh lại trước khi đăng."
                />
            )} */}
            <Form layout="vertical">
                {/* 1. Nguồn gốc */}
                <Section icon={<LinkOutlined />} title="Nguồn gốc">
                    <Form.Item
                        label="Yêu cầu tuyển dụng"
                        validateStatus={errors.requisitionId ? "error" : ""}
                        help={errors.requisitionId?.message}
                        style={selectedReq ? { marginBottom: 12 } : undefined}
                    >
                        <Controller
                            name="requisitionId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    disabled={!!editingItem}
                                    showSearch
                                    optionFilterProp="label"
                                    options={approvedRequisitions.map((r) => {
                                        const min = r.approvedSalaryMin ?? r.expectedSalaryMin;
                                        const max = r.approvedSalaryMax ?? r.expectedSalaryMax;
                                        const salaryHint =
                                            min || max
                                                ? ` (${min ? min / 1e6 : "?"}–${max ? max / 1e6 : "?"}tr)`
                                                : "";
                                        return {
                                            value: r.id,
                                            label: `${r.title}${salaryHint}`,
                                        };
                                    })}
                                    placeholder="Chọn yêu cầu tuyển dụng đã được duyệt"
                                />
                            )}
                        />
                    </Form.Item>

                    {selectedReq && (
                        <div
                            style={{
                                padding: 14,
                                borderRadius: RADIUS.md,
                                background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
                                border: `1px solid ${COLORS.border}`,
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: COLORS.primaryDark,
                                    marginBottom: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <InfoCircleOutlined /> Thông tin từ yêu cầu tuyển dụng
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", rowGap: 12, columnGap: 16 }}>
                                <InfoRow label="Phòng ban" value={nameOf(departments, selectedReq.departmentId)} />
                                <InfoRow label="Chức vụ" value={nameOf(jobTitles, selectedReq.jobTitleId)} />
                                <InfoRow label="Cấp bậc" value={nameOf(jobLevels, selectedReq.jobLevelId)} />
                                <InfoRow label="Số lượng cần tuyển" value={`${selectedReq.quantity} người`} />
                                <InfoRow label="Người yêu cầu" value={selectedReq.requesterName} />
                                <InfoRow label="Độ ưu tiên" value={<PriorityBadge priority={selectedReq.priority} />} />
                                <InfoRow
                                    label="Ngày mong muốn bắt đầu"
                                    value={selectedReq.expectedStartDate ?? "—"}
                                />
                                <InfoRow
                                    label="Mức lương đã duyệt"
                                    value={fmtSalaryRange(
                                        selectedReq.approvedSalaryMin ?? selectedReq.expectedSalaryMin,
                                        selectedReq.approvedSalaryMax ?? selectedReq.expectedSalaryMax,
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </Section>

                {/* 2. Thông tin tin tuyển dụng */}
                <Section icon={<FileTextOutlined />} title="Thông tin tin tuyển dụng">
                    <Form.Item label="Tiêu đề tin" validateStatus={errors.title ? "error" : ""} help={errors.title?.message}>
                        <Controller
                            name="title"
                            control={control}
                            render={({ field }) => <Input {...field} placeholder="Ví dụ: Backend Developer Java" />}
                        />
                    </Form.Item>

                    <div style={gridStyle}>
                        <Form.Item
                            label="Loại hình làm việc"
                            validateStatus={errors.employmentTypeId ? "error" : ""}
                            help={errors.employmentTypeId?.message}
                        >
                            <Controller
                                name="employmentTypeId"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        {...field}
                                        options={employmentTypes.map((e) => ({ value: e.id, label: e.name as string }))}
                                        placeholder="Chọn loại hình"
                                    />
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Hình thức làm việc"
                            validateStatus={errors.workArrangement ? "error" : ""}
                            help={errors.workArrangement?.message}
                        >
                            <Controller
                                name="workArrangement"
                                control={control}
                                render={({ field }) => (
                                    <Select {...field} options={WORK_ARRANGEMENT_OPTIONS} placeholder="Chọn hình thức" />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Địa điểm làm việc"
                            style={span2Style}
                            validateStatus={errors.workLocationId ? "error" : ""}
                            help={errors.workLocationId?.message}
                        >
                            <Controller
                                name="workLocationId"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        {...field}
                                        options={workLocations.map((w) => ({ value: w.id, label: w.name as string }))}
                                        placeholder="Chọn địa điểm"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Kinh nghiệm yêu cầu"
                            style={span2Style}
                        >
                            <Controller
                                name="experienceRequired"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        value={field.value ?? ""}
                                        prefix={<ClockCircleOutlined style={{ color: COLORS.textMuted }} />}
                                        placeholder="Ví dụ: 2+ năm kinh nghiệm Java / Spring Boot"
                                    />
                                )}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Quy trình tuyển dụng"
                        validateStatus={errors.pipelineId ? "error" : ""}
                        help={errors.pipelineId?.message}
                    >
                        <Controller
                            name="pipelineId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    disabled={!!editingItem?.pipelineLocked}
                                    options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
                                    placeholder="Chọn quy trình tuyển dụng"
                                />
                            )}
                        />
                    </Form.Item>
                </Section>

                {/* 3. Lương */}
                <Section icon={<DollarCircleOutlined />} title="Lương">
                    <Form.Item label="Khoảng lương dự kiến (VNĐ/tháng)">
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <Controller
                                name="salaryMin"
                                control={control}
                                render={({ field }) => (
                                    <InputNumber
                                        {...field}
                                        value={field.value ?? undefined}
                                        style={{ width: 180 }}
                                        min={0}
                                        placeholder="Từ"
                                        addonAfter="₫"
                                        formatter={moneyFormatter}
                                        parser={moneyParser}
                                    />
                                )}
                            />
                            <span style={{ color: COLORS.textMuted }}>—</span>
                            <Controller
                                name="salaryMax"
                                control={control}
                                render={({ field }) => (
                                    <InputNumber
                                        {...field}
                                        value={field.value ?? undefined}
                                        style={{ width: 180 }}
                                        min={0}
                                        placeholder="Đến"
                                        addonAfter="₫"
                                        formatter={moneyFormatter}
                                        parser={moneyParser}
                                    />
                                )}
                            />
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
                            Khoảng lương sẽ hiển thị công khai trên tin tuyển dụng.
                        </div>
                    </Form.Item>
                </Section>

                {/* 4. Mô tả & Kỹ năng */}
                <Section icon={<BulbOutlined />} title="Mô tả & Kỹ năng">
                    <Form.Item label="Mô tả công việc">
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <Input.TextArea
                                    {...field}
                                    value={field.value ?? ""}
                                    rows={3}
                                    maxLength={3000}
                                    showCount
                                    placeholder="Trách nhiệm chính, công việc hàng ngày, mục tiêu của vị trí..."
                                />
                            )}
                        />
                    </Form.Item>
                    <Form.Item label="Yêu cầu ứng viên">
                        <Controller
                            name="requirements"
                            control={control}
                            render={({ field }) => (
                                <Input.TextArea
                                    {...field}
                                    value={field.value ?? ""}
                                    rows={3}
                                    maxLength={3000}
                                    showCount
                                    placeholder="Kỹ năng, kinh nghiệm, trình độ, phẩm chất cần có..."
                                />
                            )}
                        />
                    </Form.Item>
                    <Form.Item label="Kỹ năng yêu cầu">
                        <Controller
                            name="skillIds"
                            control={control}
                            render={({ field }) => (
                                <SkillMultiSelect value={field.value ?? []} onChange={field.onChange} />
                            )}
                        />
                    </Form.Item>
                </Section>

                {/* 5. Quyền lợi */}
                <Section icon={<GiftOutlined />} title="Quyền lợi">
                    <Form.Item label="Quyền lợi ứng viên nhận được">
                        <Controller
                            name="benefits"
                            control={control}
                            render={({ field }) => (
                                <Input.TextArea
                                    {...field}
                                    value={field.value ?? ""}
                                    rows={3}
                                    maxLength={2000}
                                    showCount
                                    placeholder="Lương thưởng, phúc lợi, môi trường làm việc..."
                                />
                            )}
                        />
                    </Form.Item>
                </Section>
            </Form>
        </Modal>
    );
}
