import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button, Radio, Checkbox, App } from "antd";
import {
    MinusOutlined,
    PlusOutlined,
    SolutionOutlined,
    TeamOutlined,
    DollarOutlined,
    CalendarOutlined,
    FileTextOutlined,
    EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { requisitionSchema, type RequisitionFormValues } from "../schemas/requisitionSchema";
import { createRequisition, updateRequisition, submitRequisition } from "../recruitmentApi";
import { getUsers } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import SkillMultiSelect from "../../masterdata/components/SkillMultiSelect";
import JobTitleQuickAddSelect from "../../masterdata/components/JobTitleQuickAddSelect";
import type { ApiMessageResponse, JobRequisitionResponse } from "../types";
import { COLORS, RADIUS } from "../../../app/theme";
import { WORK_ARRANGEMENT_OPTIONS, REASON_OPTIONS, PRIORITY_OPTIONS } from "../requisitionOptions";
import { SectionHeader, SectionContainer } from "../../../components/ui/sectionKit";
import { ModalTitle } from "../../../components/ui/pageKit";
import { moneyFormatter, moneyParser } from "../../../app/money";

interface RequisitionFormModalProps {
    open: boolean;
    editingItem: JobRequisitionResponse | null;
    onClose: () => void;
    onSuccess: () => void;
}

/** Lưới 3 cột cho các trường ngắn (select, số) — tận dụng chiều ngang modal rộng. */
const grid3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    columnGap: 12,
};

/** Lưới 2 cột cho các vùng nhập dài (textarea). */
const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    columnGap: 12,
};

const spanAll: React.CSSProperties = { gridColumn: "1 / -1" };

export default function RequisitionFormModal({
    open,
    editingItem,
    onClose,
    onSuccess,
}: RequisitionFormModalProps) {
    const { message } = App.useApp();
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [jobLevels, setJobLevels] = useState<CatalogItem[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [savingDraft, setSavingDraft] = useState(false);
    const [savingSubmit, setSavingSubmit] = useState(false);
    const [negotiable, setNegotiable] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<RequisitionFormValues>({
        resolver: zodResolver(requisitionSchema),
    });

    useEffect(() => {
        if (!open) return;
        Promise.all([
            getCatalogItems("/masterdata/departments"),
            getCatalogItems("/masterdata/job-levels"),
            getCatalogItems("/masterdata/employment-types"),
            getCatalogItems("/masterdata/work-locations"),
            getUsers("RECRUITER"),
            getUsers("COMPANY_ADMIN"),
        ]).then(([deptRes, levelRes, empTypeRes, locationRes, recruiterRes, adminRes]) => {
            setDepartments(deptRes.data);
            setJobLevels(levelRes.data);
            setEmploymentTypes(empTypeRes.data);
            setWorkLocations(locationRes.data);
            const approvers = [...recruiterRes.data, ...adminRes.data];
            // Không hiển thị chọn người duyệt trên form — tự động gán cho một nhân sự HR khi tạo mới.
            if (!editingItem && approvers.length > 0) {
                setValue("approverId", approvers[0].id);
            }
        });
    }, [open]);

    useEffect(() => {
        if (editingItem) {
            reset({
                title: editingItem.title,
                departmentId: editingItem.departmentId,
                jobTitleId: editingItem.jobTitleId,
                jobLevelId: editingItem.jobLevelId ?? undefined,
                quantity: editingItem.quantity,
                employmentTypeId: editingItem.employmentTypeId ?? undefined,
                workLocationId: editingItem.workLocationId ?? undefined,
                workArrangement: editingItem.workArrangement ?? undefined,
                experienceRequired: editingItem.experienceRequired,
                reason: editingItem.reason ?? undefined,
                priority: editingItem.priority ?? "NORMAL",
                note: editingItem.note,
                budget: editingItem.budget,
                expectedSalaryMin: editingItem.expectedSalaryMin,
                expectedSalaryMax: editingItem.expectedSalaryMax,
                expectedStartDate: editingItem.expectedStartDate ?? "",
                description: editingItem.description ?? "",
                requirements: editingItem.requirements ?? "",
                benefits: editingItem.benefits,
                skillIds: editingItem.skillIds ?? [],
                approverId: editingItem.approverId,
            });
            setNegotiable(editingItem.expectedSalaryMin == null && editingItem.expectedSalaryMax == null);
        } else {
            reset({
                title: "",
                departmentId: undefined,
                jobTitleId: undefined,
                jobLevelId: undefined,
                quantity: 1,
                employmentTypeId: undefined,
                workLocationId: undefined,
                workArrangement: undefined,
                experienceRequired: "",
                reason: undefined,
                priority: "NORMAL",
                note: "",
                budget: null,
                expectedSalaryMin: null,
                expectedSalaryMax: null,
                expectedStartDate: "",
                description: "",
                requirements: "",
                benefits: "",
                skillIds: [],
                approverId: undefined,
            });
            setNegotiable(false);
        }
    }, [editingItem, open, reset]);

    const toggleNegotiable = (checked: boolean) => {
        setNegotiable(checked);
        if (checked) {
            setValue("expectedSalaryMin", null);
            setValue("expectedSalaryMax", null);
        }
    };

    const saveOnly = async (data: RequisitionFormValues) => {
        if (editingItem) {
            await updateRequisition(editingItem.id, data);
            return editingItem.id;
        }
        const res = await createRequisition(data);
        return res.data.id;
    };

    const onSaveDraft = async (data: RequisitionFormValues) => {
        setSavingDraft(true);
        try {
            await saveOnly(data);
            message.success("Đã lưu bản nháp");
            onSuccess();
            onClose();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Lưu bản nháp thất bại");
        } finally {
            setSavingDraft(false);
        }
    };

    const onSubmitForApproval = async (data: RequisitionFormValues) => {
        setSavingSubmit(true);
        try {
            const id = await saveOnly(data);
            await submitRequisition(id);
            message.success("Đã gửi yêu cầu tuyển dụng đến HR");
            onSuccess();
            onClose();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Gửi yêu cầu thất bại");
        } finally {
            setSavingSubmit(false);
        }
    };

    const busy = savingDraft || savingSubmit;

    return (
        <Modal
            title={
                <ModalTitle
                    icon={editingItem ? <EditOutlined /> : <SolutionOutlined />}
                    title={editingItem ? "Sửa yêu cầu tuyển dụng" : "Tạo yêu cầu tuyển dụng"}
                    subtitle="Điền thông tin nhu cầu và gửi đến HR để xử lý"
                />
            }
            open={open}
            onCancel={onClose}
            width={1100}
            centered
            destroyOnHidden
            styles={{
                body: {
                    maxHeight: "72vh",
                    overflowY: "auto",
                    padding: 12,
                    background: "#FAFBFC",
                },
                footer: { padding: 12, borderTop: `1px solid ${COLORS.borderLight}` },
            }}
            footer={[
                <Button key="cancel" onClick={onClose} disabled={busy}>
                    Hủy
                </Button>,
                <Button key="draft" onClick={handleSubmit(onSaveDraft)} loading={savingDraft} disabled={savingSubmit}>
                    Lưu nháp
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={handleSubmit(onSubmitForApproval)}
                    loading={savingSubmit}
                    disabled={savingDraft}
                >
                    Gửi yêu cầu
                </Button>,
            ]}
        >
            <style>{`.req-qty-input .ant-input-number-input { text-align: center; }`}</style>
            <Form layout="vertical">
                {/* 1. Thông tin vị trí */}
                <SectionContainer>
                <SectionHeader icon={<SolutionOutlined />} title="Thông tin vị trí" />
                <Form.Item label="Vị trí cần tuyển" validateStatus={errors.title ? "error" : ""} help={errors.title?.message}>
                    <Controller
                        name="title"
                        control={control}
                        render={({ field }) => <Input {...field} placeholder="Ví dụ: Backend Developer Java" />}
                    />
                </Form.Item>

                <div style={grid3}>
                    <Form.Item
                        label="Phòng ban"
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
                        validateStatus={errors.jobTitleId ? "error" : ""}
                        help={errors.jobTitleId?.message}
                    >
                        <Controller
                            name="jobTitleId"
                            control={control}
                            render={({ field }) => (
                                <JobTitleQuickAddSelect value={field.value} onChange={field.onChange} />
                            )}
                        />
                    </Form.Item>

                    <Form.Item label="Cấp bậc" validateStatus={errors.jobLevelId ? "error" : ""} help={errors.jobLevelId?.message}>
                        <Controller
                            name="jobLevelId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={jobLevels.map((l) => ({ value: l.id, label: l.name as string }))}
                                    placeholder="Chọn cấp bậc"
                                />
                            )}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Số lượng"
                        validateStatus={errors.quantity ? "error" : ""}
                        help={errors.quantity?.message}
                    >
                        <Controller
                            name="quantity"
                            control={control}
                            render={({ field }) => (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: RADIUS.md,
                                        overflow: "hidden",
                                        width: 140,
                                    }}
                                >
                                    <Button
                                        type="text"
                                        icon={<MinusOutlined />}
                                        onClick={() => field.onChange(Math.max(1, (field.value ?? 1) - 1))}
                                        style={{ borderRadius: 0, flexShrink: 0 }}
                                    />
                                    <InputNumber
                                        className="req-qty-input"
                                        controls={false}
                                        variant="borderless"
                                        min={1}
                                        value={field.value}
                                        onChange={(v) => field.onChange(v ?? 1)}
                                        style={{ flex: 1, width: 0 }}
                                    />
                                    <Button
                                        type="text"
                                        icon={<PlusOutlined />}
                                        onClick={() => field.onChange((field.value ?? 0) + 1)}
                                        style={{ borderRadius: 0, flexShrink: 0 }}
                                    />
                                </div>
                            )}
                        />
                    </Form.Item>

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
                                    options={employmentTypes.map((t) => ({ value: t.id, label: t.name as string }))}
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
                        style={spanAll}
                        validateStatus={errors.workLocationId ? "error" : ""}
                        help={errors.workLocationId?.message}
                    >
                        <Controller
                            name="workLocationId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={workLocations.map((l) => ({ value: l.id, label: l.name as string }))}
                                    placeholder="Chọn địa điểm"
                                />
                            )}
                        />
                    </Form.Item>
                </div>
                </SectionContainer>

                {/* 2. Yêu cầu nhân sự */}
                <SectionContainer>
                <SectionHeader icon={<TeamOutlined />} title="Yêu cầu nhân sự" />
                <div style={grid2}>
                <Form.Item label="Mô tả công việc" validateStatus={errors.description ? "error" : ""} help={errors.description?.message}>
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <Input.TextArea
                                {...field}
                                value={field.value ?? ""}
                                rows={4}
                                placeholder="Trách nhiệm chính, công việc hàng ngày, mục tiêu của vị trí..."
                            />
                        )}
                    />
                </Form.Item>
                <Form.Item label="Yêu cầu ứng viên" validateStatus={errors.requirements ? "error" : ""} help={errors.requirements?.message}>
                    <Controller
                        name="requirements"
                        control={control}
                        render={({ field }) => (
                            <Input.TextArea
                                {...field}
                                value={field.value ?? ""}
                                rows={4}
                                placeholder="Kỹ năng, kinh nghiệm, trình độ, phẩm chất cần có..."
                            />
                        )}
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
                <Form.Item label="Kỹ năng / chuyên môn">
                    <Controller
                        name="skillIds"
                        control={control}
                        render={({ field }) => <SkillMultiSelect value={field.value ?? []} onChange={field.onChange} />}
                    />
                </Form.Item>
                </div>
                </SectionContainer>

                {/* 3. Mức lương dự kiến */}
                <SectionContainer>
                <SectionHeader icon={<DollarOutlined />} title="Mức lương dự kiến" />
                <Form.Item label="Mức lương / tháng">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Controller
                            name="expectedSalaryMin"
                            control={control}
                            render={({ field }) => (
                                <InputNumber
                                    {...field}
                                    value={field.value ?? undefined}
                                    disabled={negotiable}
                                    style={{ width: 200 }}
                                    min={0}
                                    placeholder="Từ"
                                    addonAfter="đ"
                                    formatter={moneyFormatter}
                                    parser={moneyParser}
                                />
                            )}
                        />
                        <span style={{ color: COLORS.textMuted }}>—</span>
                        <Controller
                            name="expectedSalaryMax"
                            control={control}
                            render={({ field }) => (
                                <InputNumber
                                    {...field}
                                    value={field.value ?? undefined}
                                    disabled={negotiable}
                                    style={{ width: 200 }}
                                    min={0}
                                    placeholder="Đến"
                                    addonAfter="đ"
                                    formatter={moneyFormatter}
                                    parser={moneyParser}
                                />
                            )}
                        />
                    </div>
                    <Checkbox
                        checked={negotiable}
                        onChange={(e) => toggleNegotiable(e.target.checked)}
                        style={{ marginTop: 8 }}
                    >
                        Chưa xác định / Thỏa thuận
                    </Checkbox>
                </Form.Item>
                </SectionContainer>

                {/* 4. Lý do & Thời gian */}
                <SectionContainer>
                <SectionHeader icon={<CalendarOutlined />} title="Lý do & Thời gian" />
                <Form.Item label="Lý do tuyển dụng" validateStatus={errors.reason ? "error" : ""} help={errors.reason?.message}>
                    <Controller
                        name="reason"
                        control={control}
                        render={({ field }) => <Radio.Group {...field} options={REASON_OPTIONS} />}
                    />
                </Form.Item>
                <div style={grid2}>
                    <Form.Item label="Mức độ ưu tiên">
                        <Controller
                            name="priority"
                            control={control}
                            render={({ field }) => <Select {...field} options={PRIORITY_OPTIONS} />}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Ngày dự kiến bắt đầu"
                        validateStatus={errors.expectedStartDate ? "error" : ""}
                        help={errors.expectedStartDate?.message}
                    >
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
                </div>
                </SectionContainer>

                {/* 5. Ghi chú cho HR */}
                <SectionContainer style={{ marginBottom: 0 }}>
                <SectionHeader icon={<FileTextOutlined />} title="Ghi chú cho HR" />
                <Form.Item label="Ghi chú thêm">
                    <Controller
                        name="note"
                        control={control}
                        render={({ field }) => (
                            <Input.TextArea
                                {...field}
                                value={field.value ?? ""}
                                rows={3}
                                placeholder="Thông tin bổ sung giúp HR hiểu rõ hơn về nhu cầu (dự án, lý do gấp...)"
                            />
                        )}
                    />
                </Form.Item>
                </SectionContainer>
            </Form>
        </Modal>
    );
}
