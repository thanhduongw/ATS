import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Input, InputNumber, Select, Spin } from "antd";
import type { AxiosError } from "axios";

import { offerCreateSchema, type OfferCreateFormValues } from "../schemas/offerCreateSchema";
import { createOffer, getOfferById, getOffers, updateOffer } from "../offerApi";
import type { ApiMessageResponse, OfferResponse } from "../types";
import OfferLetterPreview from "../components/OfferLetterPreview";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { getApplicationById, getApplications } from "../../candidate/applicationApi";
import type { ApplicationResponse } from "../../candidate/types";
import { getPostingById, getPostings, getRequisitionById } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse, JobRequisitionResponse } from "../../recruitment/types";
import { getApplicationEvaluations } from "../../interview/interviewApi";
import type { EvaluationResponse, RecommendationType } from "../../interview/types";
import { getPublicCompany } from "../../public/publicApi";
import { useAppSelector } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { moneyFormatter, moneyParser } from "../../../app/money";
import { salaryText } from "../../public/jobFormat";
import DateField from "../../../components/ui/DateField";
import { Panel, ScreenTitle } from "../../../components/ui/designKit";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";

/**
 * R24 · Soạn thư mời (theo bản mẫu `docs/UI/HR.html`): bên trái "Điều khoản" (lưới 3 cột) + "Tham chiếu"
 * (khung lương duyệt, đề xuất của người phỏng vấn, còn suất, vị trí trong khung lương); bên phải "Xem trước
 * thư mời" cập nhật theo từng phím gõ. "Lưu & xem lại" lưu nháp rồi mở R26 để kiểm tra và gửi.
 *
 * Bỏ so với bản cũ (bản mẫu không có): ô "Người duyệt" — HR gửi thẳng từ bản nháp (B2), người duyệt tự gán là
 * người soạn (nợ kỹ thuật: backend vẫn bắt buộc `approverId`); ô tiền tệ (luôn VND); ô tick phúc lợi chuẩn.
 */
const REC_LABEL: Record<RecommendationType, string> = {
    STRONG_YES: "Rất nên tuyển", YES: "Nên tuyển", NO: "Không nên tuyển", STRONG_NO: "Không tuyển",
};
const GRID3: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px 16px" };
const GRID2: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px 16px" };
const FULL: CSSProperties = { width: "100%" };

interface Reference {
    min: number | null;
    max: number | null;
    recommendations: string[];
    salaryNote: string | null;
    headcount: number | null;
    taken: number;
    /** Đại diện phòng ban đã gửi yêu cầu tuyển dụng (dòng phụ dưới tiêu đề). */
    rep: string | null;
}

export default function OfferCreatePage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { message } = App.useApp();
    const me = useAppSelector((s) => s.auth.user);

    const editingId = id ? Number(id) : null;
    const applicationIdParam = searchParams.get("applicationId");
    const hasFixedApplication = !!editingId || !!applicationIdParam;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    const [posting, setPosting] = useState<JobPostingResponse | null>(null);
    const [requesterName, setRequesterName] = useState(me?.fullName ?? "");
    const [contractTypes, setContractTypes] = useState<CatalogItem[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [company, setCompany] = useState("");
    const [reference, setReference] = useState<Reference | null>(null);

    // Chọn dần phòng ban → việc làm → ứng viên (chỉ khi mở trang không kèm hồ sơ)
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [postingId, setPostingId] = useState<number | null>(null);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);

    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<OfferCreateFormValues>({
        resolver: zodResolver(offerCreateSchema),
    });
    const draft = useWatch({ control });

    /* Tham chiếu: khung lương của yêu cầu đã duyệt, đề xuất trong phiếu đánh giá, suất còn lại. */
    const loadReference = useCallback(async (app: ApplicationResponse, jd: JobPostingResponse | null, selfId?: number | null) => {
        const [req, evals, offers] = await Promise.all([
            jd?.requisitionId ? getRequisitionById(jd.requisitionId).then((r) => r.data).catch(() => null) : Promise.resolve(null as JobRequisitionResponse | null),
            getApplicationEvaluations(app.id).then((r) => r.data).catch(() => [] as EvaluationResponse[]),
            getOffers({ jobPostingId: app.jobPostingId, size: 1000 }).then((r) => r.data.content).catch(() => [] as OfferResponse[]),
        ]);
        const submitted = evals.filter((e) => e.submittedAt && e.overallRecommendation);
        setReference({
            min: req?.approvedSalaryMin ?? req?.expectedSalaryMin ?? jd?.salaryMin ?? null,
            max: req?.approvedSalaryMax ?? req?.expectedSalaryMax ?? jd?.salaryMax ?? null,
            recommendations: [...new Set(submitted.map((e) => REC_LABEL[e.overallRecommendation!]))],
            salaryNote: submitted.map((e) => e.salaryNote).find((n) => !!n) ?? null,
            headcount: jd?.headcount ?? null,
            rep: req?.requesterName ?? null,
            taken: offers.filter((o) => o.id !== selfId && ["ACCEPTED", "APPROVED", "PENDING_APPROVAL"].includes(o.status)).length,
        });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [ctRes, deptRes, locRes] = await Promise.all([
                getCatalogItems("/masterdata/contract-types"),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/work-locations"),
            ]);
            setContractTypes(ctRes.data.filter((c) => c.active !== false));
            setDepartments(deptRes.data);
            setWorkLocations(locRes.data);
            getPublicCompany().then((r) => setCompany(r.data.name)).catch(() => undefined);

            const openApp = async (appId: number) => {
                const app = (await getApplicationById(appId)).data;
                setApplication(app);
                const jd = app.jobPostingId ? (await getPostingById(app.jobPostingId)).data : null;
                setPosting(jd);
                return { app, jd };
            };

            if (editingId) {
                const o = (await getOfferById(editingId)).data;
                const { app, jd } = await openApp(o.applicationId);
                setRequesterName(o.requesterName ?? me?.fullName ?? "");
                void loadReference(app, jd, o.id);
                reset({
                    applicationId: o.applicationId, salaryOffered: o.salaryOffered, contractTypeId: o.contractTypeId,
                    startDate: o.startDate, probationMonths: o.probationMonths ?? 0, reportingManager: o.reportingManager ?? "",
                    workLocationId: o.workLocationId ?? null, currency: o.currency ?? "VND", payFrequency: o.payFrequency ?? "MONTHLY",
                    performanceBonus: o.performanceBonus ?? "", annualLeaveDays: o.annualLeaveDays ?? 12, benefits: o.benefits ?? "",
                    allowance: o.allowance ?? 0, note: o.note ?? "", candidateVisibleNote: o.candidateVisibleNote ?? "",
                    approverId: o.approverId, responseDeadline: o.responseDeadline ?? "",
                });
                return;
            }

            let jd: JobPostingResponse | null = null;
            let appId: number | undefined;
            if (applicationIdParam) {
                appId = Number(applicationIdParam);
                const opened = await openApp(appId);
                jd = opened.jd;
                void loadReference(opened.app, jd);
            }
            reset({
                applicationId: appId as number,
                salaryOffered: jd?.salaryMin ?? 15_000_000,
                contractTypeId: undefined as unknown as number,
                startDate: "",
                probationMonths: 2,
                reportingManager: "",
                workLocationId: jd?.workLocationId ?? null,
                currency: "VND",
                payFrequency: "MONTHLY",
                performanceBonus: "",
                annualLeaveDays: 12,
                benefits: jd?.benefits ?? "",
                allowance: 0,
                note: "",
                candidateVisibleNote: "",
                // Gửi thẳng từ bản nháp (B2): người duyệt = người soạn. Backend vẫn bắt buộc trường này (nợ kỹ thuật).
                approverId: Number(me?.userId),
                responseDeadline: "",
            });
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không tải được dữ liệu thư mời");
            navigate("/offers");
        } finally {
            setLoading(false);
        }
    }, [editingId, applicationIdParam, reset, message, navigate, me, loadReference]);

    useEffect(() => { void load(); }, [load]);

    const pickDepartment = async (value: number | null) => {
        setDepartmentId(value);
        setPostingId(null);
        setPostings([]);
        setApplications([]);
        setApplication(null);
        setPosting(null);
        setReference(null);
        setValue("applicationId", undefined as unknown as number);
        if (value == null) return;
        const res = await getPostings({ size: 1000 }).catch(() => null);
        setPostings((res?.data.content ?? []).filter((p) => p.departmentId === value));
    };

    const pickPosting = async (value: number | null) => {
        setPostingId(value);
        setApplications([]);
        setApplication(null);
        setReference(null);
        setValue("applicationId", undefined as unknown as number);
        const jd = postings.find((p) => p.id === value) ?? null;
        setPosting(jd);
        if (jd?.salaryMin != null) setValue("salaryOffered", jd.salaryMin);
        if (jd?.benefits) setValue("benefits", jd.benefits);
        if (jd?.workLocationId != null) setValue("workLocationId", jd.workLocationId);
        if (value == null) return;
        const res = await getApplications({ jobPostingId: value, stageType: "OFFER", size: 1000 }).catch(() => null);
        setApplications(res?.data.content ?? []);
    };

    const persist = async (data: OfferCreateFormValues) => {
        const payload = {
            salaryOffered: data.salaryOffered,
            contractTypeId: data.contractTypeId,
            startDate: data.startDate,
            probationMonths: data.probationMonths,
            reportingManager: data.reportingManager || null,
            workLocationId: data.workLocationId ?? null,
            currency: "VND",
            payFrequency: data.payFrequency || "MONTHLY",
            performanceBonus: data.performanceBonus || null,
            annualLeaveDays: data.annualLeaveDays ?? null,
            benefits: data.benefits?.trim() || null,
            allowance: data.allowance ?? null,
            note: data.note || null,
            candidateVisibleNote: data.candidateVisibleNote || null,
            approverId: data.approverId,
            responseDeadline: data.responseDeadline || null,
        };
        if (editingId) {
            await updateOffer(editingId, payload);
            return editingId;
        }
        return (await createOffer({ ...payload, applicationId: data.applicationId })).data.id;
    };

    const save = (review: boolean) => handleSubmit(async (data) => {
        setSaving(true);
        try {
            const offerId = await persist(data);
            if (!review) message.success("Đã lưu bản nháp");
            navigate(`/offers/${offerId}`);
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Lưu thư mời thất bại");
        } finally {
            setSaving(false);
        }
    }, () => message.warning("Còn thông tin bắt buộc chưa điền — xem các ô đánh dấu đỏ."));

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 64 }}><Spin size="large" /></div>;

    const ready = hasFixedApplication || !!application;
    const candidateName = application?.candidateName ?? "";
    const deptName = posting?.departmentName ?? application?.departmentName ?? null;
    const contractName = contractTypes.find((c) => c.id === draft.contractTypeId)?.name?.toString() ?? null;
    const locationName = workLocations.find((w) => w.id === draft.workLocationId)?.name?.toString() ?? "";
    const salary = draft.salaryOffered ?? null;
    const range = reference && reference.min != null && reference.max != null && reference.max > reference.min ? reference : null;
    const rangePct = range && salary != null ? Math.max(0, Math.min(100, ((salary - range.min!) / (range.max! - range.min!)) * 100)) : null;
    const outOfRange = range && salary != null && (salary < range.min! || salary > range.max!);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <PageBreadcrumb crumb={candidateName || "Soạn thư mời"} />
                <ScreenTitle
                    title={`Thư mời${candidateName ? ` · ${candidateName}` : ""}`}
                    subtitle={posting ? `${posting.title}${reference?.rep ? ` · Đại diện phòng ban ${reference.rep}` : ""}` : undefined}
                    actions={<>
                        <Button onClick={() => navigate(-1)}>Huỷ</Button>
                        <Button loading={saving} disabled={!ready} onClick={save(false)}>Lưu nháp</Button>
                        <Button type="primary" loading={saving} disabled={!ready} onClick={save(true)}>Lưu & xem lại</Button>
                    </>}
                />
            </div>

            {!hasFixedApplication && (
                <Panel title="Chọn ứng viên">
                    <div style={GRID3}>
                        <Field label="Phòng ban" required>
                            <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn phòng ban" style={FULL}
                                value={departmentId ?? undefined} onChange={(v) => void pickDepartment(v ?? null)}
                                options={departments.map((d) => ({ value: d.id, label: String(d.name) }))} />
                        </Field>
                        <Field label="Việc làm" required>
                            <Select allowClear showSearch optionFilterProp="label" style={FULL} disabled={departmentId == null}
                                placeholder={departmentId == null ? "Chọn phòng ban trước" : "Chọn việc làm"}
                                value={postingId ?? undefined} onChange={(v) => void pickPosting(v ?? null)}
                                options={postings.map((p) => ({ value: p.id, label: p.title }))} />
                        </Field>
                        <Field label="Ứng viên (giai đoạn Thư mời)" required error={errors.applicationId?.message}>
                            <Controller name="applicationId" control={control} render={({ field }) => (
                                <Select showSearch optionFilterProp="label" style={FULL} disabled={postingId == null}
                                    placeholder={postingId == null ? "Chọn việc làm trước" : "Chọn ứng viên"}
                                    notFoundContent="Chưa có ứng viên ở giai đoạn Thư mời"
                                    value={field.value} options={applications.map((a) => ({ value: a.id, label: a.candidateName }))}
                                    onChange={(v) => {
                                        field.onChange(v);
                                        const picked = applications.find((a) => a.id === v) ?? null;
                                        setApplication(picked);
                                        if (picked) void loadReference(picked, posting);
                                    }} />
                            )} />
                        </Field>
                    </div>
                </Panel>
            )}

            {ready && (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 420px)", gap: 16, alignItems: "start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                        <Panel title="Điều khoản" bodyGap={12}>
                            <div style={GRID3}>
                                <Field label="Lương gộp / tháng (đồng)" required error={errors.salaryOffered?.message}
                                    hint={reference && (reference.min != null || reference.max != null) ? `Khung duyệt ${salaryText(reference.min, reference.max)}` : undefined}>
                                    <Controller name="salaryOffered" control={control} render={({ field }) => (
                                        <InputNumber style={FULL} min={0} step={500_000} formatter={moneyFormatter} parser={moneyParser}
                                            status={outOfRange ? "warning" : undefined}
                                            value={field.value} onChange={(v) => field.onChange(v ?? undefined)} />
                                    )} />
                                </Field>
                                <Field label="Phụ cấp / tháng (đồng)">
                                    <Controller name="allowance" control={control} render={({ field }) => (
                                        <InputNumber style={FULL} min={0} step={100_000} formatter={moneyFormatter} parser={moneyParser}
                                            value={field.value ?? undefined} onChange={(v) => field.onChange(v ?? 0)} />
                                    )} />
                                </Field>
                                <Field label="Kỳ trả lương">
                                    <Controller name="payFrequency" control={control} render={({ field }) => (
                                        <Select style={FULL} value={field.value ?? "MONTHLY"} onChange={field.onChange}
                                            options={[{ value: "MONTHLY", label: "Hằng tháng" }, { value: "YEARLY", label: "Hằng năm" }]} />
                                    )} />
                                </Field>
                                <Field label="Ngày bắt đầu" required error={errors.startDate?.message}>
                                    <Controller name="startDate" control={control} render={({ field }) => (
                                        <DateField futureOnly value={field.value} onChange={field.onChange} />
                                    )} />
                                </Field>
                                <Field label="Thời gian thử việc">
                                    <Controller name="probationMonths" control={control} render={({ field }) => (
                                        <Select style={FULL} value={field.value} onChange={field.onChange}
                                            options={[0, 1, 2, 3, 6].map((m) => ({ value: m, label: m ? `${m} tháng` : "Không thử việc" }))} />
                                    )} />
                                </Field>
                                <Field label="Loại hợp đồng" required error={errors.contractTypeId?.message}>
                                    <Controller name="contractTypeId" control={control} render={({ field }) => (
                                        <Select style={FULL} placeholder="Chọn loại hợp đồng" value={field.value} onChange={field.onChange}
                                            options={contractTypes.map((c) => ({ value: c.id, label: String(c.name) }))} />
                                    )} />
                                </Field>
                                <Field label="Nơi làm việc">
                                    <Controller name="workLocationId" control={control} render={({ field }) => (
                                        <Select style={FULL} allowClear placeholder="Chọn nơi làm việc" value={field.value ?? undefined}
                                            onChange={(v) => field.onChange(v ?? null)}
                                            options={workLocations.map((w) => ({ value: w.id, label: String(w.name) }))} />
                                    )} />
                                </Field>
                                <Field label="Báo cáo cho">
                                    <Controller name="reportingManager" control={control} render={({ field }) => (
                                        <Input value={field.value ?? ""} onChange={field.onChange} placeholder="Họ tên quản lý trực tiếp" />
                                    )} />
                                </Field>
                                <Field label="Ngày phép / năm">
                                    <Controller name="annualLeaveDays" control={control} render={({ field }) => (
                                        <InputNumber style={FULL} min={0} max={60} suffix="ngày"
                                            value={field.value ?? undefined} onChange={(v) => field.onChange(v ?? null)} />
                                    )} />
                                </Field>
                            </div>
                            <div style={GRID2}>
                                <Field label="Thưởng hiệu suất">
                                    <Controller name="performanceBonus" control={control} render={({ field }) => (
                                        <Input value={field.value ?? ""} onChange={field.onChange} placeholder="Ví dụ: tối đa 2 tháng lương/năm, xét theo quý" />
                                    )} />
                                </Field>
                                <Field label="Hạn phản hồi" required error={errors.responseDeadline?.message}>
                                    <Controller name="responseDeadline" control={control} render={({ field }) => (
                                        <DateField withTime futureOnly placeholder="Chọn hạn phản hồi" value={field.value} onChange={field.onChange} />
                                    )} />
                                </Field>
                            </div>
                            <Field label="Phúc lợi" hint="Mỗi dòng một mục — hiện thành danh sách trong thư.">
                                <Controller name="benefits" control={control} render={({ field }) => (
                                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} value={field.value ?? ""} onChange={field.onChange}
                                        placeholder={"Bảo hiểm sức khoẻ cho bản thân\nLương tháng 13"} />
                                )} />
                            </Field>
                            <Field label="Lời nhắn cho ứng viên">
                                <Controller name="candidateVisibleNote" control={control} render={({ field }) => (
                                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} value={field.value ?? ""} onChange={field.onChange}
                                        placeholder="Vài lời chúc mừng, điều cần chuẩn bị…" />
                                )} />
                            </Field>
                            <Field label="Ghi chú nội bộ (ứng viên không thấy)">
                                <Controller name="note" control={control} render={({ field }) => (
                                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} value={field.value ?? ""} onChange={field.onChange}
                                        placeholder="Lý do chốt mức lương, điểm cần lưu ý khi thương lượng…" />
                                )} />
                            </Field>
                        </Panel>

                        {reference && (
                            <Panel title="Tham chiếu" bodyGap={12}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
                                    <RefItem label="Khung lương duyệt" value={reference.min != null || reference.max != null ? salaryText(reference.min, reference.max) : "—"} />
                                    <RefItem label="Người phỏng vấn đề xuất" value={reference.recommendations.join(", ") || "Chưa có đánh giá"} />
                                    <RefItem label="Ghi chú lương từ phỏng vấn" value={reference.salaryNote ?? "—"} />
                                    <RefItem label="Còn suất" value={reference.headcount ? `${Math.max(0, reference.headcount - reference.taken)}/${reference.headcount}` : "—"} />
                                </div>
                                {rangePct != null && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                            Vị trí trong khung lương{outOfRange ? " — mức lương đang NGOÀI khung đã duyệt" : ""}
                                        </span>
                                        <div style={{ height: 6, borderRadius: 3, background: COLORS.fill, overflow: "hidden" }}>
                                            <div style={{ width: `${rangePct}%`, height: "100%", background: outOfRange ? COLORS.warning : COLORS.primary }} />
                                        </div>
                                    </div>
                                )}
                            </Panel>
                        )}
                    </div>

                    <div style={{ position: "sticky", top: 0 }}>
                        <Panel title="Xem trước thư mời">
                            <OfferLetterPreview data={{
                                company, location: locationName, candidateName, jobTitle: posting?.title ?? application?.jobTitle,
                                deptName, salaryOffered: salary, allowance: draft.allowance, payFrequency: draft.payFrequency,
                                startDate: draft.startDate, probationMonths: draft.probationMonths, contractTypeName: contractName,
                                annualLeaveDays: draft.annualLeaveDays, reportingManager: draft.reportingManager, benefits: draft.benefits,
                                candidateVisibleNote: draft.candidateVisibleNote, responseDeadline: draft.responseDeadline,
                                requesterName: requesterName || me?.fullName,
                            }} />
                        </Panel>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, required, error, hint, children }: {
    label: string; required?: boolean; error?: string; hint?: string; children: ReactNode;
}) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                {label}{required && <span style={{ color: COLORS.error }}> *</span>}
            </span>
            {children}
            {error ? <span style={{ fontSize: 12, color: COLORS.error }}>{error}</span>
                : hint ? <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{hint}</span> : null}
        </label>
    );
}

function RefItem({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
            <b style={{ fontSize: 14 }}>{value}</b>
        </div>
    );
}
