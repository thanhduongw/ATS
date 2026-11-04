import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Form, Input, InputNumber, Modal, Segmented, Select, Spin, Switch } from "antd";
import { DesktopOutlined, MobileOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { postingSchema, type PostingFormValues } from "../schemas/postingSchema";
import { createPosting, getPostingById, getRequisitions, submitPostingForReview, updatePosting } from "../recruitmentApi";
import type { ApiMessageResponse, JobPostingResponse, JobRequisitionResponse } from "../types";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import SkillMultiSelect from "../../masterdata/components/SkillMultiSelect";
import { WORK_ARRANGEMENT_OPTIONS, SKILL_REQUIRED_HINT } from "../requisitionOptions";
import { requisitionCode } from "../useRecruitmentCatalogs";
import JobContent from "../../public/components/JobContent";
import type { PublicJobPosting } from "../../public/types";
import { salaryText } from "../../public/jobFormat";
import { moneyFormatter, moneyParser } from "../../../app/money";
import { COLORS, FIXED_STAGES, STAGE_COLORS } from "../../../app/theme";
import { FIXED_STAGE_LABEL } from "../../../app/stages";
import { InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";
import DateField from "../../../components/ui/DateField";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";

/**
 * R07 · Tạo / sửa việc làm từ yêu cầu tuyển dụng (trang, thay PostingFormModal).
 * Cột phải "Từ yêu cầu tuyển dụng": số lượng, cấp bậc, lương duyệt, đại diện phòng ban, giai đoạn cố định;
 * "Hiển thị trên trang tuyển dụng": hiện mức lương, gắn nhãn Tuyển gấp.
 * R08 · Xem trước tin: giống trang công khai C03, chuyển máy tính / điện thoại.
 * "Gửi duyệt" = lưu rồi chuyển tin sang "Chờ đăng" (backend: DRAFT/EDITING → APPROVED), đăng ở trang việc làm.
 */
const grid3 = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 12 } as const;

export default function PostingFormPage() {
    const { id } = useParams();
    const editingId = id ? Number(id) : null;
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [editing, setEditing] = useState<JobPostingResponse | null>(null);
    const [requisitions, setRequisitions] = useState<JobRequisitionResponse[]>([]);
    const [cat, setCat] = useState<Record<string, CatalogItem[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<null | "draft" | "submit">(null);
    const [preview, setPreview] = useState<null | "desktop" | "mobile">(null);

    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PostingFormValues>({
        resolver: zodResolver(postingSchema),
        defaultValues: { title: "", skillIds: [], urgent: false, showSalary: true, applicationDeadline: "" },
    });
    const values = watch();
    const reqId = watch("requisitionId");

    useEffect(() => {
        Promise.all([
            getRequisitions({ size: 1000 }),
            getCatalogItems("/masterdata/departments"),
            getCatalogItems("/masterdata/job-levels"),
            getCatalogItems("/masterdata/employment-types"),
            getCatalogItems("/masterdata/work-locations"),
            getPipelines(),
            editingId ? getPostingById(editingId).then((r) => r.data) : Promise.resolve(null),
        ]).then(([rq, dept, lvl, emp, loc, pipes, post]) => {
            setRequisitions(rq.data.content.filter((r) => r.status === "APPROVED"));
            setCat({ dept: dept.data, lvl: lvl.data, emp: emp.data.filter((x) => x.active), loc: loc.data.filter((x) => x.active) });
            const pipelineId = (pipes.data.find((p) => p.active && p.isDefault) ?? pipes.data.find((p) => p.active))?.id;
            if (post) {
                setEditing(post);
                reset({
                    requisitionId: post.requisitionId, title: post.title, employmentTypeId: post.employmentTypeId,
                    workLocationId: post.workLocationId, workArrangement: post.workArrangement ?? undefined,
                    experienceRequired: post.experienceRequired, pipelineId: post.pipelineId,
                    salaryMin: post.salaryMin, salaryMax: post.salaryMax, description: post.description,
                    requirements: post.requirements, benefits: post.benefits, skillIds: post.skillIds ?? [],
                    benchmarkCriteria: post.benchmarkCriteria ?? null,
                    applicationDeadline: post.applicationDeadline ?? "", urgent: !!post.urgent, showSalary: post.showSalary !== false,
                });
            } else {
                if (pipelineId) setValue("pipelineId", pipelineId);
                const preset = Number(params.get("requisitionId"));
                if (preset) setValue("requisitionId", preset);
                setValue("applicationDeadline", dayjs().add(30, "day").format("YYYY-MM-DD"));
            }
        }).catch(() => message.error("Không tải được dữ liệu"))
            .finally(() => setLoading(false));
    }, [editingId, params, reset, setValue, message]);

    const req = useMemo(() => requisitions.find((r) => r.id === reqId) ?? null, [requisitions, reqId]);

    // Tạo mới: chọn yêu cầu → điền sẵn tiêu đề, loại hình, địa điểm, lương duyệt, mô tả, yêu cầu, kỹ năng.
    useEffect(() => {
        if (editingId || !req) return;
        setValue("title", req.title);
        setValue("salaryMin", req.approvedSalaryMin ?? req.expectedSalaryMin ?? null);
        setValue("salaryMax", req.approvedSalaryMax ?? req.expectedSalaryMax ?? null);
        if (req.employmentTypeId) setValue("employmentTypeId", req.employmentTypeId);
        if (req.workLocationId) setValue("workLocationId", req.workLocationId);
        if (req.workArrangement) setValue("workArrangement", req.workArrangement);
        if (req.experienceRequired) setValue("experienceRequired", req.experienceRequired);
        if (req.description) setValue("description", req.description);
        if (req.requirements) setValue("requirements", req.requirements);
        if (req.benefits) setValue("benefits", req.benefits);
        if (req.priority === "URGENT" || req.priority === "HIGH") setValue("urgent", true);
        if (req.skillIds?.length) setValue("skillIds", req.skillIds);
    }, [req, editingId, setValue]);

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    const locked = editing && !["DRAFT", "EDITING"].includes(editing.status);
    const nameOf = (k: string, v: number | null | undefined) => String(cat[k]?.find((x) => x.id === v)?.name ?? "—");
    const approvedMin = req?.approvedSalaryMin ?? req?.expectedSalaryMin ?? null;
    const approvedMax = req?.approvedSalaryMax ?? req?.expectedSalaryMax ?? null;
    const outOfRange = (values.salaryMin != null && approvedMin != null && values.salaryMin < approvedMin)
        || (values.salaryMax != null && approvedMax != null && values.salaryMax > approvedMax);

    const save = async (data: PostingFormValues, then: "draft" | "submit") => {
        setSaving(then);
        try {
            let saved: JobPostingResponse;
            if (editing) {
                const { requisitionId: _r, ...rest } = data;
                saved = (await updatePosting(editing.id, rest)).data;
            } else {
                saved = (await createPosting(data)).data;
            }
            if (then === "submit") {
                await submitPostingForReview(saved.id);
                message.success("Đã gửi duyệt — tin ở trạng thái Chờ đăng");
            } else {
                message.success("Đã lưu nháp");
            }
            navigate(`/recruitment/postings/${saved.id}`);
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không lưu được tin");
        } finally { setSaving(null); }
    };

    const previewJob: PublicJobPosting = {
        id: 0, requisitionId: values.requisitionId ?? 0, title: values.title, employmentTypeId: values.employmentTypeId ?? 0,
        workLocationId: values.workLocationId ?? 0, pipelineId: 0,
        salaryMin: values.showSalary === false ? null : values.salaryMin ?? null,
        salaryMax: values.showSalary === false ? null : values.salaryMax ?? null,
        description: values.description ?? null, requirements: values.requirements ?? null, benefits: values.benefits ?? null,
        status: "OPEN", pipelineLocked: false, publishedAt: null, closedAt: null,
        employmentTypeName: values.employmentTypeId ? nameOf("emp", values.employmentTypeId) : null,
        workLocationName: values.workLocationId ? nameOf("loc", values.workLocationId) : null,
        headcount: req?.quantity ?? editing?.headcount ?? null, workArrangement: values.workArrangement ?? null,
        experienceRequired: values.experienceRequired ?? null,
        departmentName: req ? nameOf("dept", req.departmentId) : editing?.departmentName ?? null,
        applicationDeadline: values.applicationDeadline || null, urgent: !!values.urgent, showSalary: values.showSalary !== false,
    };

    // Kiểm tra thất bại ở trường không có ô hiển thị (vd. yêu cầu, quy trình) thì vẫn phải báo cho người dùng.
    const onInvalid = (errs: Record<string, { message?: unknown } | undefined>) => {
        const msgs = Object.values(errs).map((e) => String(e?.message ?? "")).filter(Boolean);
        message.error(msgs[0] ?? "Kiểm tra lại các ô bắt buộc");
    };

    const field = (name: keyof PostingFormValues): { validateStatus?: "error"; help?: ReactNode } =>
        errors[name] ? { validateStatus: "error", help: String(errors[name]?.message ?? "") } : {};

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <PageBreadcrumb crumb={editing ? editing.title : "Tạo mới"} />
                <ScreenTitle
                    title={editing ? "Sửa việc làm" : "Tạo việc làm"}
                    actions={<>
                        <Button disabled={!!locked} loading={saving === "draft"} onClick={handleSubmit((d) => save(d, "draft"), onInvalid)}>Lưu nháp</Button>
                        <Button onClick={() => setPreview("desktop")}>Xem trước</Button>
                        <Button type="primary" disabled={!!locked} loading={saving === "submit"} onClick={handleSubmit((d) => save(d, "submit"), onInvalid)}>Gửi duyệt</Button>
                    </>}
                />
            </div>
            {locked && <InlineNotice tone="warning">Tin đang ở trạng thái đã duyệt / đang tuyển — chọn "Sửa lại" ở trang việc làm trước khi chỉnh nội dung.</InlineNotice>}
            {!editing && requisitions.length === 0 && <InlineNotice tone="warning">Chưa có yêu cầu tuyển dụng nào đã duyệt để tạo việc làm.</InlineNotice>}

            <Form layout="vertical" requiredMark component="div" disabled={!!locked}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16, alignItems: "start" }}>
                    <Panel title="Nội dung tin" bodyGap={0}>
                        <Form.Item label="Tiêu đề tin" required {...field("title")}>
                            <Controller name="title" control={control} render={({ field: f }) => <Input {...f} maxLength={200} placeholder="Ví dụ: Lập trình viên Backend (Java/Spring)" />} />
                        </Form.Item>
                        <div style={grid3}>
                            <Form.Item label="Loại hình" required {...field("employmentTypeId")}>
                                <Controller name="employmentTypeId" control={control} render={({ field: f }) => (
                                    <Select {...f} placeholder="Chọn" options={(cat.emp ?? []).map((x) => ({ value: x.id, label: String(x.name) }))} />)} />
                            </Form.Item>
                            <Form.Item label="Hình thức" required {...field("workArrangement")}>
                                <Controller name="workArrangement" control={control} render={({ field: f }) => (
                                    <Select {...f} placeholder="Chọn" options={WORK_ARRANGEMENT_OPTIONS} />)} />
                            </Form.Item>
                            <Form.Item label="Địa điểm" required {...field("workLocationId")}>
                                <Controller name="workLocationId" control={control} render={({ field: f }) => (
                                    <Select {...f} placeholder="Chọn" options={(cat.loc ?? []).map((x) => ({ value: x.id, label: String(x.name) }))} />)} />
                            </Form.Item>
                            <Form.Item label="Hạn nộp hồ sơ" required {...field("applicationDeadline")}>
                                <Controller name="applicationDeadline" control={control} render={({ field: f }) => (
                                    <DateField futureOnly value={f.value} onChange={f.onChange} />)} />
                            </Form.Item>
                            <Form.Item label="Kinh nghiệm yêu cầu" style={{ gridColumn: "span 2" }}>
                                <Controller name="experienceRequired" control={control} render={({ field: f }) => (
                                    <Input {...f} value={f.value ?? ""} maxLength={300} placeholder="Ví dụ: Từ 2 năm" />)} />
                            </Form.Item>
                        </div>
                        <Form.Item label="Mô tả công việc" required>
                            <Controller name="description" control={control} render={({ field: f }) => (
                                <Input.TextArea {...f} value={f.value ?? ""} rows={7} maxLength={3000} showCount
                                    placeholder="Giới thiệu đội, rồi mỗi dòng một trách nhiệm chính…" />)} />
                        </Form.Item>
                        <Form.Item label="Yêu cầu" required>
                            <Controller name="requirements" control={control} render={({ field: f }) => (
                                <Input.TextArea {...f} value={f.value ?? ""} rows={6} maxLength={3000} showCount placeholder="Mỗi dòng một yêu cầu…" />)} />
                        </Form.Item>
                        <Form.Item label="Quyền lợi">
                            <Controller name="benefits" control={control} render={({ field: f }) => (
                                <Input.TextArea {...f} value={f.value ?? ""} rows={5} maxLength={3000} showCount placeholder="Mỗi dòng một quyền lợi…" />)} />
                        </Form.Item>
                        <Form.Item label="Kỹ năng yêu cầu" extra={SKILL_REQUIRED_HINT} style={{ marginBottom: 0 }}>
                            <Controller name="skillIds" control={control} render={({ field: f }) => (
                                <SkillMultiSelect value={f.value ?? []} onChange={f.onChange} />)} />
                        </Form.Item>
                    </Panel>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <Panel title="Từ yêu cầu tuyển dụng" bodyGap={8}>
                            <Form.Item style={{ marginBottom: 4 }} {...field("requisitionId")}>
                                <Controller name="requisitionId" control={control} render={({ field: f }) => (
                                    <Select {...f} disabled={!!editing} showSearch optionFilterProp="label" placeholder="Chọn yêu cầu đã duyệt"
                                        options={requisitions.map((r) => ({ value: r.id, label: `${r.title} · ${requisitionCode(r.id)}` }))} />)} />
                            </Form.Item>
                            {req && (<>
                                <Row label="Mã yêu cầu" value={requisitionCode(req.id)} />
                                <Row label="Số lượng" value={`${req.quantity} người`} />
                                <Row label="Cấp bậc" value={nameOf("lvl", req.jobLevelId)} />
                                <Row label="Lương duyệt" value={salaryText(approvedMin, approvedMax)} />
                                <Row label="Đại diện phòng ban" value={req.requesterName} />
                            </>)}
                            <span style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Giai đoạn tuyển dụng · Cố định cho mọi vị trí</span>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {FIXED_STAGES.filter((s) => s !== "REJECTED").map((s) => (
                                    <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: STAGE_COLORS[s].bg, color: STAGE_COLORS[s].text }}>{FIXED_STAGE_LABEL[s]}</span>
                                ))}
                            </div>
                        </Panel>

                        <Panel title="Hiển thị trên trang tuyển dụng" bodyGap={10}>
                            <Toggle label="Hiện mức lương" control={<Controller name="showSalary" control={control} render={({ field: f }) => <Switch checked={f.value !== false} onChange={f.onChange} />} />} />
                            {values.showSalary !== false && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <Controller name="salaryMin" control={control} render={({ field: f }) => (
                                        <InputNumber {...f} value={f.value ?? undefined} min={0} step={500000} placeholder="Từ" style={{ flex: 1 }} formatter={moneyFormatter} parser={moneyParser} />)} />
                                    <span style={{ color: COLORS.textMuted }}>–</span>
                                    <Controller name="salaryMax" control={control} render={({ field: f }) => (
                                        <InputNumber {...f} value={f.value ?? undefined} min={0} step={500000} placeholder="Đến" style={{ flex: 1 }} formatter={moneyFormatter} parser={moneyParser} />)} />
                                </div>
                            )}
                            {outOfRange && <span style={{ fontSize: 12, color: COLORS.warning }}>Khoảng lương đang vượt khung đã duyệt ({salaryText(approvedMin, approvedMax)}).</span>}
                            {values.showSalary === false && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Trang tuyển dụng sẽ ghi "Thoả thuận".</span>}
                            <Toggle label='Gắn nhãn "Tuyển gấp"' control={<Controller name="urgent" control={control} render={({ field: f }) => <Switch checked={!!f.value} onChange={f.onChange} />} />} />
                        </Panel>
                    </div>
                </div>
            </Form>

            <Modal open={!!preview} onCancel={() => setPreview(null)} footer={null} width={preview === "mobile" ? 460 : 1000} centered
                title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span>Xem trước tin</span>
                    <Segmented size="small" value={preview ?? "desktop"} onChange={(v) => setPreview(v as "desktop" | "mobile")}
                        options={[{ value: "desktop", icon: <DesktopOutlined />, label: "Máy tính" }, { value: "mobile", icon: <MobileOutlined />, label: "Điện thoại" }]} />
                </div>}
                styles={{ body: { background: COLORS.body, padding: preview === "mobile" ? 12 : 20, maxHeight: "75vh", overflowY: "auto", borderRadius: 12 } }}>
                <div style={{ maxWidth: preview === "mobile" ? 390 : undefined, margin: "0 auto" }}>
                    <JobContent job={previewJob} compact={preview === "mobile"} showSalary />
                </div>
            </Modal>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: "right" }}>{value}</span>
        </div>
    );
}

function Toggle({ label, control }: { label: string; control: ReactNode }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 14 }}>{label}</span>
            {control}
        </div>
    );
}
