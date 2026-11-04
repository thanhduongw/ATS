import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useForm, Controller, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Form, Input, InputNumber, Select, Spin } from "antd";
import type { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { requisitionSchema, type RequisitionFormValues } from "../schemas/requisitionSchema";
import { createRequisition, getRequisitionById, submitRequisition, updateRequisition } from "../recruitmentApi";
import { getUserDirectory } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import SkillMultiSelect from "../../masterdata/components/SkillMultiSelect";
import JobTitleQuickAddSelect from "../../masterdata/components/JobTitleQuickAddSelect";
import type { ApiMessageResponse, JobRequisitionResponse } from "../types";
import { PRIORITY_OPTIONS, REASON_OPTIONS, SKILL_REQUIRED_HINT } from "../requisitionOptions";
import { WORK_ARRANGEMENT_LABEL } from "../postingLabels";
import { requisitionCode } from "../useRecruitmentCatalogs";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, RADIUS } from "../../../app/theme";
import { moneyFormatter, moneyParser } from "../../../app/money";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import DateField from "../../../components/ui/DateField";
import { InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";

/**
 * H05 · Tạo / sửa yêu cầu tuyển dụng — trang riêng, 4 phần:
 * 1. Vị trí · 2. Số lượng & lý do · 3. Ngân sách · 4. Nội dung công việc.
 * Route: /recruitment/requisitions/new và /recruitment/requisitions/:id/edit.
 * Người duyệt không chọn trên form — tự gán cho một Chuyên viên tuyển dụng (giữ như bản modal cũ).
 */
const grid3: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 16 };
const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 16 };

const EMPTY: Partial<RequisitionFormValues> = {
    title: "", quantity: 1, experienceRequired: "", priority: "NORMAL", note: "", budget: null,
    expectedSalaryMin: null, expectedSalaryMax: null, expectedStartDate: "", description: "",
    requirements: "", benefits: "", skillIds: [],
};

function err(e?: FieldError) {
    return e ? { validateStatus: "error" as const, help: e.message } : {};
}

function Section({ no, title, hint, children }: { no: number; title: string; hint?: string; children: ReactNode }) {
    return (
        <Panel
            title={<span>{no}. {title}{hint && <span style={{ fontSize: 13, fontWeight: 400, color: COLORS.textSecondary, marginLeft: 10 }}>{hint}</span>}</span>}
            bodyGap={4}
        >
            {children}
        </Panel>
    );
}

export default function RequisitionFormPage() {
    const { id } = useParams();
    const editingId = id ? Number(id) : null;
    const navigate = useNavigate();
    const { message } = App.useApp();
    const myDept = useAppSelector((s) => s.auth.user?.departmentId ?? null);

    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [jobLevels, setJobLevels] = useState<CatalogItem[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [original, setOriginal] = useState<JobRequisitionResponse | null>(null);
    const [loading, setLoading] = useState(!!editingId);
    const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

    const { control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<RequisitionFormValues>({
        resolver: zodResolver(requisitionSchema),
        defaultValues: EMPTY,
    });

    useEffect(() => {
        const active = (r: { data: CatalogItem[] }) => r.data.filter((x) => x.active);
        Promise.all([
            getCatalogItems("/masterdata/departments"),
            getCatalogItems("/masterdata/job-levels"),
            getCatalogItems("/masterdata/employment-types"),
            getCatalogItems("/masterdata/work-locations"),
            getUserDirectory("RECRUITER"),
            getUserDirectory("COMPANY_ADMIN"),
        ]).then(([d, l, e, w, rec, adm]) => {
            setDepartments(active(d));
            setJobLevels(active(l));
            setEmploymentTypes(active(e));
            setWorkLocations(active(w));
            const approvers = [...rec.data, ...adm.data];
            if (!getValues("approverId") && approvers.length > 0) setValue("approverId", approvers[0].id);
            if (!editingId && myDept != null && getValues("departmentId") == null) setValue("departmentId", myDept);
        }).catch(() => message.error("Không tải được danh mục"));
    }, [editingId, myDept, getValues, setValue, message]);

    useEffect(() => {
        if (!editingId) return;
        getRequisitionById(editingId).then((r) => {
            const x = r.data;
            setOriginal(x);
            reset({
                title: x.title, departmentId: x.departmentId, jobTitleId: x.jobTitleId,
                jobLevelId: x.jobLevelId ?? undefined, quantity: x.quantity,
                employmentTypeId: x.employmentTypeId ?? undefined, workLocationId: x.workLocationId ?? undefined,
                workArrangement: x.workArrangement ?? undefined, experienceRequired: x.experienceRequired,
                reason: x.reason ?? undefined, priority: x.priority ?? "NORMAL", note: x.note, budget: x.budget,
                expectedSalaryMin: x.expectedSalaryMin, expectedSalaryMax: x.expectedSalaryMax,
                expectedStartDate: x.expectedStartDate ?? "", description: x.description ?? "",
                requirements: x.requirements ?? "", benefits: x.benefits, skillIds: x.skillIds ?? [],
                approverId: x.approverId,
            });
        }).catch(() => message.error("Không tải được yêu cầu tuyển dụng"))
            .finally(() => setLoading(false));
    }, [editingId, reset, message]);

    const back = () => navigate(editingId ? `/recruitment/requisitions/${editingId}` : "/recruitment/requisitions");

    const save = async (data: RequisitionFormValues, submit: boolean) => {
        setSaving(submit ? "submit" : "draft");
        try {
            let reqId = editingId;
            if (reqId) await updateRequisition(reqId, data);
            else reqId = (await createRequisition(data)).data.id;
            if (submit) await submitRequisition(reqId);
            message.success(submit ? "Đã gửi yêu cầu đến Chuyên viên tuyển dụng" : "Đã lưu bản nháp");
            navigate(`/recruitment/requisitions/${reqId}`);
        } catch (e) {
            const ax = e as AxiosError<ApiMessageResponse>;
            message.error(ax.response?.data?.message ?? (submit ? "Gửi duyệt thất bại" : "Lưu bản nháp thất bại"));
        } finally {
            setSaving(null);
        }
    };

    if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spin /></div>;
    if (original && original.status !== "DRAFT" && original.status !== "CHANGES_REQUESTED") {
        return (
            <InlineNotice tone="warning" action={<Button onClick={back}>Xem yêu cầu</Button>}>
                Yêu cầu {requisitionCode(original.id)} đã gửi đi nên không sửa được nữa.
            </InlineNotice>
        );
    }

    const needsFix = original?.status === "CHANGES_REQUESTED";
    const crumb = editingId ? `Sửa ${requisitionCode(editingId)}` : "Tạo mới";
    const money = (name: "expectedSalaryMin" | "expectedSalaryMax" | "budget", placeholder: string) => (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <InputNumber
                    value={field.value ?? undefined}
                    onChange={(v) => field.onChange(v ?? null)}
                    style={{ width: 220 }}
                    min={0}
                    placeholder={placeholder}
                    suffix="đ"
                    formatter={moneyFormatter}
                    parser={moneyParser}
                />
            )}
        />
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1080 }}>
            <div>
                <PageBreadcrumb crumb={crumb} />
                <ScreenTitle
                    title={editingId ? (needsFix ? "Sửa và gửi lại yêu cầu" : "Sửa yêu cầu tuyển dụng") : "Tạo yêu cầu tuyển dụng"}
                    actions={
                        <>
                            <Button onClick={back} disabled={!!saving}>Huỷ</Button>
                            <Button onClick={handleSubmit((d) => save(d, false))} loading={saving === "draft"} disabled={saving === "submit"}>
                                Lưu nháp
                            </Button>
                            <Button type="primary" onClick={handleSubmit((d) => save(d, true))} loading={saving === "submit"} disabled={saving === "draft"}>
                                {needsFix ? "Gửi lại" : "Gửi duyệt"}
                            </Button>
                        </>
                    }
                />
            </div>

            {needsFix && original?.hrNote && (
                <InlineNotice tone="warning">
                    Chuyên viên tuyển dụng yêu cầu sửa: “{original.hrNote}”
                </InlineNotice>
            )}

            <Form layout="vertical" requiredMark>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Section no={1} title="Vị trí" hint="Thông tin chung của vị trí cần tuyển">
                        <div style={grid2}>
                            <Form.Item label="Tên vị trí" required {...err(errors.title)}>
                                <Controller name="title" control={control}
                                    render={({ field }) => <Input {...field} placeholder="Ví dụ: Lập trình viên di động" />} />
                            </Form.Item>
                            <Form.Item label="Phòng ban" required {...err(errors.departmentId)}>
                                <Controller name="departmentId" control={control}
                                    render={({ field }) => (
                                        <Select {...field} placeholder="Chọn phòng ban"
                                            options={departments.map((d) => ({ value: d.id, label: String(d.name) }))} />
                                    )} />
                            </Form.Item>
                        </div>
                        <div style={grid3}>
                            <Form.Item label="Chức danh" required {...err(errors.jobTitleId)}>
                                <Controller name="jobTitleId" control={control}
                                    render={({ field }) => <JobTitleQuickAddSelect value={field.value} onChange={field.onChange} />} />
                            </Form.Item>
                            <Form.Item label="Cấp bậc" required {...err(errors.jobLevelId)}>
                                <Controller name="jobLevelId" control={control}
                                    render={({ field }) => (
                                        <Select {...field} placeholder="Chọn cấp bậc"
                                            options={jobLevels.map((l) => ({ value: l.id, label: String(l.name) }))} />
                                    )} />
                            </Form.Item>
                            <Form.Item label="Kinh nghiệm">
                                <Controller name="experienceRequired" control={control}
                                    render={({ field }) => <Input {...field} value={field.value ?? ""} placeholder="Ví dụ: Từ 2 năm" />} />
                            </Form.Item>
                            <Form.Item label="Loại hình" required {...err(errors.employmentTypeId)}>
                                <Controller name="employmentTypeId" control={control}
                                    render={({ field }) => (
                                        <Select {...field} placeholder="Chọn loại hình"
                                            options={employmentTypes.map((t) => ({ value: t.id, label: String(t.name) }))} />
                                    )} />
                            </Form.Item>
                            <Form.Item label="Hình thức" required {...err(errors.workArrangement)}>
                                <Controller name="workArrangement" control={control}
                                    render={({ field }) => (
                                        <Select {...field} placeholder="Chọn hình thức"
                                            options={(["ONSITE", "HYBRID", "REMOTE"] as const).map((v) => ({ value: v, label: WORK_ARRANGEMENT_LABEL[v] }))} />
                                    )} />
                            </Form.Item>
                            <Form.Item label="Địa điểm" required {...err(errors.workLocationId)}>
                                <Controller name="workLocationId" control={control}
                                    render={({ field }) => (
                                        <Select {...field} placeholder="Chọn địa điểm"
                                            options={workLocations.map((l) => ({ value: l.id, label: String(l.name) }))} />
                                    )} />
                            </Form.Item>
                        </div>
                        <Form.Item label="Kỹ năng yêu cầu" extra={SKILL_REQUIRED_HINT} style={{ marginBottom: 0 }}>
                            <Controller name="skillIds" control={control}
                                render={({ field }) => <SkillMultiSelect value={field.value ?? []} onChange={field.onChange} />} />
                        </Form.Item>
                    </Section>

                    <Section no={2} title="Số lượng & lý do">
                        <div style={grid3}>
                            <Form.Item label="Số lượng" required {...err(errors.quantity)}>
                                <Controller name="quantity" control={control}
                                    render={({ field }) => (
                                        <InputNumber value={field.value} onChange={(v) => field.onChange(v ?? 1)} min={1}
                                            suffix="người" style={{ width: "100%" }} />
                                    )} />
                            </Form.Item>
                            <Form.Item label="Ngày bắt đầu mong muốn" required {...err(errors.expectedStartDate)}>
                                <Controller name="expectedStartDate" control={control}
                                    render={({ field }) => (
                                        <DateField value={field.value} onChange={field.onChange} />
                                    )} />
                            </Form.Item>
                            <Form.Item label="Độ ưu tiên">
                                <Controller name="priority" control={control}
                                    render={({ field }) => <Select {...field} options={PRIORITY_OPTIONS} />} />
                            </Form.Item>
                        </div>
                        <Form.Item label="Lý do tuyển" required {...err(errors.reason)}>
                            <Controller name="reason" control={control}
                                render={({ field }) => (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {REASON_OPTIONS.map((o) => {
                                            const on = field.value === o.value;
                                            return (
                                                <button key={o.value} type="button" onClick={() => field.onChange(o.value)}
                                                    style={{
                                                        height: 32, padding: "0 14px", borderRadius: 16, cursor: "pointer",
                                                        fontFamily: "inherit", fontSize: 14,
                                                        border: `1px solid ${on ? COLORS.primary : COLORS.border}`,
                                                        background: on ? COLORS.primarySoft : COLORS.cardBg,
                                                        color: on ? COLORS.primary : COLORS.textPrimary, fontWeight: on ? 600 : 400,
                                                    }}>
                                                    {o.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )} />
                        </Form.Item>
                        <Form.Item label="Giải thích thêm" style={{ marginBottom: 0 }}>
                            <Controller name="note" control={control}
                                render={({ field }) => (
                                    <Input.TextArea {...field} value={field.value ?? ""} rows={3}
                                        placeholder="Vì sao cần tuyển, cần gấp đến đâu…" />
                                )} />
                        </Form.Item>
                    </Section>

                    <Section no={3} title="Ngân sách" hint="Chuyên viên tuyển dụng sẽ chốt khung lương khi duyệt">
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <Form.Item label="Lương đề xuất (đồng/tháng)" style={{ marginBottom: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {money("expectedSalaryMin", "Từ")}
                                    <span style={{ color: COLORS.textMuted }}>đến</span>
                                    {money("expectedSalaryMax", "Đến")}
                                </div>
                            </Form.Item>
                            <Form.Item label="Ngân sách tối đa / tháng" style={{ marginBottom: 0 }}>
                                {money("budget", "Tổng cho cả vị trí")}
                            </Form.Item>
                        </div>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 6 }}>
                            Bỏ trống nếu chưa xác định — lương sẽ được thoả thuận.
                        </span>
                    </Section>

                    <Section no={4} title="Nội dung công việc" hint="Dùng lại khi tạo tin tuyển dụng">
                        {(["description", "requirements", "benefits"] as const).map((name) => (
                            <Form.Item
                                key={name}
                                label={name === "description" ? "Mô tả công việc" : name === "requirements" ? "Yêu cầu" : "Quyền lợi"}
                                required={name !== "benefits"}
                                {...err(errors[name])}
                                style={name === "benefits" ? { marginBottom: 0 } : undefined}
                            >
                                <Controller name={name} control={control}
                                    render={({ field }) => (
                                        <Input.TextArea {...field} value={field.value ?? ""} rows={5}
                                            style={{ borderRadius: RADIUS.md }}
                                            placeholder={name === "description" ? "Trách nhiệm chính, công việc hằng ngày…"
                                                : name === "requirements" ? "Mỗi dòng một ý. Kỹ năng ưu tiên ghi kèm chữ 'Ưu tiên'."
                                                    : "Lương thưởng, thiết bị, phúc lợi…"} />
                                    )} />
                            </Form.Item>
                        ))}
                    </Section>
                </div>
            </Form>
        </div>
    );
}
