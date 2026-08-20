import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, InputNumber, Select, DatePicker, Divider, App } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { requisitionSchema, type RequisitionFormValues } from "../schemas/requisitionSchema";
import { createRequisition, updateRequisition } from "../recruitmentApi";
import { getUsers } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import SkillMultiSelect from "../../masterdata/components/SkillMultiSelect";
import type { UserSummaryResponse } from "../../auth/types";
import type { ApiMessageResponse, JobRequisitionResponse } from "../types";

interface RequisitionFormModalProps {
    open: boolean;
    editingItem: JobRequisitionResponse | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RequisitionFormModal({
    open,
    editingItem,
    onClose,
    onSuccess,
}: RequisitionFormModalProps) {
    const { message } = App.useApp();
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [jobTitles, setJobTitles] = useState<CatalogItem[]>([]);
    const [jobLevels, setJobLevels] = useState<CatalogItem[]>([]);
    const [hrApprovers, setHrApprovers] = useState<UserSummaryResponse[]>([]);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<RequisitionFormValues>({
        resolver: zodResolver(requisitionSchema),
    });

    useEffect(() => {
        if (!open) return;
        Promise.all([
            getCatalogItems("/masterdata/departments"),
            getCatalogItems("/masterdata/job-titles"),
            getCatalogItems("/masterdata/job-levels"),
            getUsers("RECRUITER"),
            getUsers("COMPANY_ADMIN"),
        ]).then(([deptRes, titleRes, levelRes, recruiterRes, adminRes]) => {
            setDepartments(deptRes.data);
            setJobTitles(titleRes.data);
            setJobLevels(levelRes.data);
            setHrApprovers([...recruiterRes.data, ...adminRes.data]);
        });
    }, [open]);

    useEffect(() => {
        if (editingItem) {
            reset({
                title: editingItem.title,
                departmentId: editingItem.departmentId,
                jobTitleId: editingItem.jobTitleId,
                jobLevelId: editingItem.jobLevelId,
                quantity: editingItem.quantity,
                budget: editingItem.budget,
                expectedSalaryMin: editingItem.expectedSalaryMin,
                expectedSalaryMax: editingItem.expectedSalaryMax,
                expectedStartDate: editingItem.expectedStartDate,
                description: editingItem.description,
                requirements: editingItem.requirements,
                benefits: editingItem.benefits,
                skillIds: editingItem.skillIds ?? [],
                approverId: editingItem.approverId,
            });
        } else {
            reset({
                title: "",
                departmentId: undefined,
                jobTitleId: undefined,
                jobLevelId: null,
                quantity: 1,
                budget: null,
                expectedSalaryMin: null,
                expectedSalaryMax: null,
                expectedStartDate: null,
                description: "",
                requirements: "",
                benefits: "",
                skillIds: [],
                approverId: undefined,
            });
        }
    }, [editingItem, open, reset]);

    const onSubmit = async (data: RequisitionFormValues) => {
        try {
            if (editingItem) {
                await updateRequisition(editingItem.id, data);
                message.success("Cập nhật thành công");
            } else {
                await createRequisition(data);
                message.success("Tạo yêu cầu tuyển dụng thành công");
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
            title={editingItem ? "Sửa yêu cầu tuyển dụng" : "Tạo yêu cầu tuyển dụng"}
            open={open}
            onOk={handleSubmit(onSubmit)}
            onCancel={onClose}
            confirmLoading={isSubmitting}
            okText={editingItem ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
            width={720}
            destroyOnHidden
        >
            <Form layout="vertical">
                <Divider titlePlacement="start" plain style={{ marginTop: 0 }}>
                    Thông tin chung
                </Divider>
                <Form.Item label="Tiêu đề" validateStatus={errors.title ? "error" : ""} help={errors.title?.message}>
                    <Controller name="title" control={control} render={({ field }) => <Input {...field} />} />
                </Form.Item>

                <div style={{ display: "flex", gap: 16 }}>
                    <Form.Item
                        label="Phòng ban"
                        style={{ flex: 1 }}
                        validateStatus={errors.departmentId ? "error" : ""}
                        help={errors.departmentId?.message}
                    >
                        <Controller
                            name="departmentId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={departments.map((d) => ({ value: d.id, label: d.name as string }))}
                                    placeholder="Chọn phòng ban"
                                />
                            )}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Chức vụ"
                        style={{ flex: 1 }}
                        validateStatus={errors.jobTitleId ? "error" : ""}
                        help={errors.jobTitleId?.message}
                    >
                        <Controller
                            name="jobTitleId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={jobTitles.map((t) => ({ value: t.id, label: t.name as string }))}
                                    placeholder="Chọn chức vụ"
                                />
                            )}
                        />
                    </Form.Item>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                    <Form.Item label="Cấp bậc " style={{ flex: 1 }}>
                        <Controller
                            name="jobLevelId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    allowClear
                                    options={jobLevels.map((l) => ({ value: l.id, label: l.name as string }))}
                                    placeholder="Chọn cấp bậc"
                                />
                            )}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Số lượng"
                        style={{ flex: 1 }}
                        validateStatus={errors.quantity ? "error" : ""}
                        help={errors.quantity?.message}
                    >
                        <Controller
                            name="quantity"
                            control={control}
                            render={({ field }) => <InputNumber {...field} style={{ width: "100%" }} min={1} />}
                        />
                    </Form.Item>
                </div>

                <Divider titlePlacement="start" plain>
                    Ngân sách &amp; Mức lương
                </Divider>
                <div style={{ display: "flex", gap: 16 }}>
                    <Form.Item label="Lương đề xuất từ" style={{ flex: 1 }}>
                        <Controller
                            name="expectedSalaryMin"
                            control={control}
                            render={({ field }) => <InputNumber {...field} style={{ width: "100%" }} min={0} />}
                        />
                    </Form.Item>
                    <Form.Item label="Lương đề xuất đến" style={{ flex: 1 }}>
                        <Controller
                            name="expectedSalaryMax"
                            control={control}
                            render={({ field }) => <InputNumber {...field} style={{ width: "100%" }} min={0} />}
                        />
                    </Form.Item>
                </div>

                <Form.Item label="Ngân sách ">
                    <Controller
                        name="budget"
                        control={control}
                        render={({ field }) => <InputNumber {...field} style={{ width: "100%" }} min={0} />}
                    />
                </Form.Item>

                <Form.Item label="Ngày cần tuyển ">
                    <Controller
                        name="expectedStartDate"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                style={{ width: "100%" }}
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(date) => field.onChange(date ? date.format("YYYY-MM-DD") : null)}
                            />
                        )}
                    />
                </Form.Item>

                <Divider titlePlacement="start" plain>
                    Mô tả chi tiết
                </Divider>
                <Form.Item label="Mô tả công việc">
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} placeholder="Trách nhiệm, đầu việc chính của vị trí này..." />}
                    />
                </Form.Item>
                <Form.Item label="Yêu cầu ứng viên">
                    <Controller
                        name="requirements"
                        control={control}
                        render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} placeholder="Kinh nghiệm, bằng cấp, năng lực cần có..." />}
                    />
                </Form.Item>
                <Form.Item label="Quyền lợi">
                    <Controller
                        name="benefits"
                        control={control}
                        render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} placeholder="Lương thưởng, phúc lợi, môi trường làm việc..." />}
                    />
                </Form.Item>

                <Divider titlePlacement="start" plain>
                    Kỹ năng yêu cầu
                </Divider>
                <Form.Item label="Kỹ năng">
                    <Controller
                        name="skillIds"
                        control={control}
                        render={({ field }) => (
                            <SkillMultiSelect value={field.value ?? []} onChange={field.onChange} />
                        )}
                    />
                </Form.Item>

                <Divider titlePlacement="start" plain>
                    Phê duyệt
                </Divider>
                <Form.Item
                    label="Người duyệt (HR)"
                    validateStatus={errors.approverId ? "error" : ""}
                    help={errors.approverId?.message}
                >
                    <Controller
                        name="approverId"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                options={hrApprovers.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
                                placeholder="Chọn nhân sự HR sẽ duyệt yêu cầu này"
                            />
                        )}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}