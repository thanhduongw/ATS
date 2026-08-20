import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, InputNumber, Select, Button, Alert, App } from "antd";
import type { AxiosError } from "axios";
import { postingSchema, type PostingFormValues } from "../schemas/postingSchema";
import { createPosting, updatePosting, getRequisitions } from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem, PipelineResponse } from "../../masterdata/types";
import SkillMultiSelect from "../../masterdata/components/SkillMultiSelect";
import type { ApiMessageResponse, JobPostingResponse, JobRequisitionResponse } from "../types";
import { COLORS } from "../../../app/theme";
import { WORK_ARRANGEMENT_OPTIONS } from "../requisitionOptions";

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

function SectionTitle({ children, first }: { children: React.ReactNode; first?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: first ? "0 0 16px" : "28px 0 16px" }}>
            <span style={{ width: 4, height: 16, borderRadius: 2, background: COLORS.primary, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: COLORS.textPrimary }}>{children}</span>
        </div>
    );
}

const moneyFormatter = (value: number | string | undefined) =>
    value || value === 0 ? new Intl.NumberFormat("vi-VN").format(Number(value)) : "";
const moneyParser = (value: string | undefined) => (value ? Number(value.replace(/\D/g, "")) : 0);

export default function PostingFormModal({ open, editingItem, onClose, onSuccess }: Props) {
    const { message } = App.useApp();
    const [approvedRequisitions, setApprovedRequisitions] = useState<JobRequisitionResponse[]>([]);
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
            getCatalogItems("/masterdata/employment-types"),
            getCatalogItems("/masterdata/work-locations"),
            getPipelines(),
        ]).then(([reqRes, empRes, locRes, pipeRes]) => {
            setApprovedRequisitions(reqRes.data.content.filter((r) => r.status === "APPROVED"));
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
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {editingItem ? "Sửa tin tuyển dụng" : "Tạo tin tuyển dụng"}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 400, color: COLORS.textSecondary, marginTop: 4 }}>
                        Đăng tin công khai từ yêu cầu tuyển dụng đã được HR phê duyệt
                    </div>
                </div>
            }
            open={open}
            onCancel={onClose}
            width={760}
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
                    style={{ marginBottom: 16 }}
                    title="Tin tuyển dụng này đã có ứng viên nộp hồ sơ nên không thể đổi Quy trình tuyển dụng."
                />
            )}
            {!editingItem && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Chỉ đăng tin từ yêu cầu đã được HR phê duyệt. Các thông tin sẽ được điền sẵn theo yêu cầu, bạn có thể chỉnh lại trước khi đăng."
                />
            )}
            <Form layout="vertical">
                {/* 1. Nguồn gốc */}
                <SectionTitle first>Nguồn gốc</SectionTitle>
                <Form.Item
                    label="Yêu cầu tuyển dụng"
                    validateStatus={errors.requisitionId ? "error" : ""}
                    help={errors.requisitionId?.message}
                >
                    <Controller
                        name="requisitionId"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                disabled={!!editingItem}
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

                {/* 2. Thông tin tin tuyển dụng */}
                <SectionTitle>Thông tin tin tuyển dụng</SectionTitle>
                <Form.Item label="Tiêu đề tin" validateStatus={errors.title ? "error" : ""} help={errors.title?.message}>
                    <Controller name="title" control={control} render={({ field }) => <Input {...field} />} />
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

                {/* 3. Lương */}
                <SectionTitle>Lương</SectionTitle>
                <Form.Item label="Khoảng lương dự kiến (VNĐ/tháng)">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <Controller
                            name="salaryMin"
                            control={control}
                            render={({ field }) => (
                                <InputNumber
                                    {...field}
                                    value={field.value ?? undefined}
                                    style={{ width: 150 }}
                                    min={0}
                                    placeholder="Từ"
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
                                    style={{ width: 150 }}
                                    min={0}
                                    placeholder="Đến"
                                    formatter={moneyFormatter}
                                    parser={moneyParser}
                                />
                            )}
                        />
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>VNĐ/tháng</span>
                    </div>
                </Form.Item>

                {/* 4. Mô tả & Kỹ năng */}
                <SectionTitle>Mô tả &amp; Kỹ năng</SectionTitle>
                <Form.Item label="Mô tả công việc">
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} />}
                    />
                </Form.Item>
                <Form.Item label="Yêu cầu ứng viên">
                    <Controller
                        name="requirements"
                        control={control}
                        render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} />}
                    />
                </Form.Item>
                <Form.Item label="Kinh nghiệm yêu cầu">
                    <Controller
                        name="experienceRequired"
                        control={control}
                        render={({ field }) => (
                            <Input {...field} value={field.value ?? ""} placeholder="Ví dụ: 2+ năm kinh nghiệm Java / Spring Boot" />
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

                {/* 5. Quyền lợi */}
                <SectionTitle>Quyền lợi</SectionTitle>
                <Form.Item label="Quyền lợi ứng viên nhận được">
                    <Controller
                        name="benefits"
                        control={control}
                        render={({ field }) => (
                            <Input.TextArea
                                {...field}
                                value={field.value ?? ""}
                                rows={3}
                                placeholder="Lương thưởng, phúc lợi, môi trường làm việc..."
                            />
                        )}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
