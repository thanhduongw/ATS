import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, Select, Alert, Divider, App } from "antd";
import type { AxiosError } from "axios";
import { postingSchema, type PostingFormValues } from "../schemas/postingSchema";
import { createPosting, updatePosting, getRequisitions } from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem, PipelineResponse } from "../../masterdata/types";
import SkillMultiSelect from "../../masterdata/components/SkillMultiSelect";
import type { ApiMessageResponse, JobPostingResponse, JobRequisitionResponse } from "../types";

interface Props {
    open: boolean;
    editingItem: JobPostingResponse | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PostingFormModal({ open, editingItem, onClose, onSuccess }: Props) {
    const { message } = App.useApp();
    const [approvedRequisitions, setApprovedRequisitions] = useState<JobRequisitionResponse[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [pipelines, setPipelines] = useState<PipelineResponse[]>([]);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
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

        if (req.description) {
            setValue("description", req.description);
        }
        if (req.requirements) {
            setValue("requirements", req.requirements);
        }
        if (req.benefits) {
            setValue("benefits", req.benefits);
        }
        if (req.skillIds && req.skillIds.length > 0) {
            setValue("skillIds", req.skillIds);
        }
    }, [selectedRequisitionId, approvedRequisitions, editingItem, setValue]);

    const onSubmit = async (data: PostingFormValues) => {
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
        }
    };

    return (
        <Modal
            title={editingItem ? "Sửa tin tuyển dụng" : "Tạo tin tuyển dụng"}
            open={open}
            onOk={handleSubmit(onSubmit)}
            onCancel={onClose}
            confirmLoading={isSubmitting}
            okText={editingItem ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
            width={720}
            destroyOnHidden
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
                    message="Chỉ đăng tin từ yêu cầu đã được HR phê duyệt. Lương mặc định lấy theo mức lương chốt duyệt."
                />
            )}
            <Form layout="vertical">
                <Divider titlePlacement="start" plain style={{ marginTop: 0 }}>
                    Nguồn gốc
                </Divider>
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

                <Divider titlePlacement="start" plain>
                    Thông tin tin tuyển dụng
                </Divider>
                <Form.Item label="Tiêu đề tin" validateStatus={errors.title ? "error" : ""} help={errors.title?.message}>
                    <Controller name="title" control={control} render={({ field }) => <Input {...field} />} />
                </Form.Item>

                <div style={{ display: "flex", gap: 16 }}>
                    <Form.Item
                        label="Loại hình làm việc"
                        style={{ flex: 1 }}
                        validateStatus={errors.employmentTypeId ? "error" : ""}
                        help={errors.employmentTypeId?.message}
                    >
                        <Controller
                            name="employmentTypeId"
                            control={control}
                            render={({ field }) => (
                                <Select {...field} options={employmentTypes.map((e) => ({ value: e.id, label: e.name as string }))} />
                            )}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Địa điểm làm việc"
                        style={{ flex: 1 }}
                        validateStatus={errors.workLocationId ? "error" : ""}
                        help={errors.workLocationId?.message}
                    >
                        <Controller
                            name="workLocationId"
                            control={control}
                            render={({ field }) => (
                                <Select {...field} options={workLocations.map((w) => ({ value: w.id, label: w.name as string }))} />
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
                            />
                        )}
                    />
                </Form.Item>

                <Divider titlePlacement="start" plain>
                    Lương
                </Divider>
                <Form.Item label="Khoảng lương dự kiến (VNĐ)">
                    <div style={{ display: "flex", gap: 12 }}>
                        <Controller
                            name="salaryMin"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    placeholder="Lương tối thiểu (VD: 12000000)"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                    style={{ flex: 1 }}
                                />
                            )}
                        />
                        <Controller
                            name="salaryMax"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    placeholder="Lương tối đa (VD: 18000000)"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                    style={{ flex: 1 }}
                                />
                            )}
                        />
                    </div>
                </Form.Item>

                <Divider titlePlacement="start" plain>
                    Mô tả &amp; Kỹ năng
                </Divider>
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
                <Form.Item label="Quyền lợi">
                    <Controller
                        name="benefits"
                        control={control}
                        render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} />}
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
            </Form>
        </Modal>
    );
}