import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, Select, Alert, App } from "antd";
import type { AxiosError } from "axios";
import { postingSchema, type PostingFormValues } from "../schemas/postingSchema";
import { createPosting, updatePosting, getRequisitions } from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem, PipelineResponse } from "../../masterdata/types";
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
        formState: { errors, isSubmitting },
    } = useForm<PostingFormValues>({
        resolver: zodResolver(postingSchema),
    });

    useEffect(() => {
        if (!open) return;
        Promise.all([
            getRequisitions(),
            getCatalogItems("/masterdata/employment-types"),
            getCatalogItems("/masterdata/work-locations"),
            getPipelines(),
        ]).then(([reqRes, empRes, locRes, pipeRes]) => {
            setApprovedRequisitions(reqRes.data.filter((r) => r.status === "APPROVED"));
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
            });
        }
    }, [editingItem, open, reset]);

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
            width={640}
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
            <Form layout="vertical">
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
                                options={approvedRequisitions.map((r) => ({ value: r.id, label: r.title }))}
                                placeholder="Chọn yêu cầu tuyển dụng đã được duyệt"
                            />
                        )}
                    />
                </Form.Item>

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
            </Form>
        </Modal>
    );
}