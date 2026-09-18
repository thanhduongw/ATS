import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Alert,
    App,
    Button,
    Card,
    Checkbox,
    DatePicker,
    Empty,
    Form,
    Input,
    InputNumber,
    Radio,
    Select,
    Spin,
    Tag,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";

import { offerCreateSchema, type OfferCreateFormValues } from "../schemas/offerCreateSchema";
import { createOffer, getOfferById, updateOffer, submitOffer } from "../offerApi";
import type { ApiMessageResponse } from "../types";
import { getUserDirectory } from "../../auth/authApi";
import type { UserDirectoryResponse } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { getApplicationById, getApplications } from "../../candidate/applicationApi";
import { getCandidateById } from "../../candidate/candidateApi";
import type { ApplicationResponse, CandidateResponse } from "../../candidate/types";
import { getPostingById, getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import { COLORS } from "../../../app/theme";
import PageHeader from "../../../components/ui/PageHeader";
import { formatMoney } from "../../../app/money";

/* ──────────────────────────────────────────────────────────────
 * Constants
 * ────────────────────────────────────────────────────────────── */

const WORK_ARRANGEMENT_LABEL: Record<string, string> = {
    ONSITE: "Tại văn phòng",
    HYBRID: "Kết hợp",
    REMOTE: "Từ xa",
};

const PAY_FREQUENCY_LABEL: Record<string, string> = {
    MONTHLY: "tháng",
    YEARLY: "năm",
};

/** Phúc lợi chuẩn – lưu dưới dạng chuỗi, UI tách thành checkbox cho dễ chọn */
const STANDARD_BENEFITS = [
    "Bảo hiểm xã hội",
    "Bảo hiểm sức khỏe",
    "Laptop công ty",
    "Phụ cấp đi lại",
    "Phụ cấp ăn trưa",
    "Cổ phần thưởng (ESOP)",
];

const BENEFIT_SEPARATOR = " · ";

const GRID: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
};

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

function splitBenefits(raw?: string | null) {
    const parts = (raw ?? "")
        .split(BENEFIT_SEPARATOR)
        .map((p) => p.trim())
        .filter(Boolean);

    return {
        checked: parts.filter((p) => STANDARD_BENEFITS.includes(p)),
        other: parts.filter((p) => !STANDARD_BENEFITS.includes(p)).join(BENEFIT_SEPARATOR),
    };
}

function joinBenefits(checked: string[], other: string) {
    return [...checked, ...(other.trim() ? [other.trim()] : [])].join(BENEFIT_SEPARATOR);
}

const nameOf = (items: CatalogItem[], id?: number | null) => {
    const found = items.find((c) => c.id === id)?.name;
    return found == null ? "—" : String(found);
};

const salaryRangeLabel = (min?: number | null, max?: number | null) =>
    `${min != null ? formatMoney(min) : "…"} – ${max != null ? formatMoney(max) : "…"}`;

/* ──────────────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────────────── */

/**
 * Tạo mới hoặc chỉnh sửa đề nghị nhận việc (bản nháp).
 *
 * - Mở từ bảng so sánh / chi tiết hồ sơ  → đã có sẵn applicationId, chỉ hiển thị lại.
 * - Mở từ nút "+ Tạo đề nghị"             → chọn tuần tự: Phòng ban → Tin tuyển dụng → Ứng viên.
 *
 * Mọi đề nghị đều neo vào tin tuyển dụng (JD) đã đăng:
 * phòng ban, khoảng lương và phúc lợi lấy từ tin, không cho HR nhập tự do.
 */
export default function OfferCreatePage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { message } = App.useApp();

    const editingId = id ? Number(id) : null;
    const applicationIdParam = searchParams.get("applicationId");
    /** Đã biết sẵn ứng viên → không cần bước chọn */
    const hasFixedApplication = !!editingId || !!applicationIdParam;

    /* ── State ──────────────────────────────────────────────── */

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    const [candidate, setCandidate] = useState<CandidateResponse | null>(null);
    const [posting, setPosting] = useState<JobPostingResponse | null>(null);

    const [approvers, setApprovers] = useState<UserDirectoryResponse[]>([]);
    const [contractTypes, setContractTypes] = useState<CatalogItem[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);

    // Chỉ dùng khi mở từ nút "+ Tạo đề nghị"
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [postingId, setPostingId] = useState<number | null>(null);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loadingPostings, setLoadingPostings] = useState(false);
    const [loadingApplications, setLoadingApplications] = useState(false);

    /* ── Form ───────────────────────────────────────────────── */

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<OfferCreateFormValues>({
        resolver: zodResolver(offerCreateSchema),
    });

    const salaryOffered = useWatch({ control, name: "salaryOffered" });
    const draft = useWatch({ control }); // dùng cho khối tóm tắt realtime

    /* ── Loaders ────────────────────────────────────────────── */

    const loadCandidate = async (candidateId?: number | null) => {
        setCandidate(null);
        if (candidateId == null) return;
        try {
            const res = await getCandidateById(candidateId);
            setCandidate(res.data);
        } catch {
            // Thiếu email/SĐT thì để trống, không chặn soạn đề nghị
        }
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [ctRes, hrRes, adminRes, deptRes, empRes, locRes] = await Promise.all([
                getCatalogItems("/masterdata/contract-types"),
                getUserDirectory("RECRUITER"),
                getUserDirectory("COMPANY_ADMIN"),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/employment-types"),
                getCatalogItems("/masterdata/work-locations"),
            ]);

            setContractTypes(ctRes.data.filter((c) => c.active !== false));
            setDepartments(deptRes.data);
            setEmploymentTypes(empRes.data);
            setWorkLocations(locRes.data);
            setApprovers(
                Array.from(
                    new Map([...hrRes.data, ...adminRes.data].map((u) => [u.id, u])).values(),
                ),
            );

            // ── Chỉnh sửa đề nghị đã có ──────────────────────
            if (editingId) {
                const offerRes = await getOfferById(editingId);
                const o = offerRes.data;

                const appRes = await getApplicationById(o.applicationId);
                setApplication(appRes.data);
                loadCandidate(appRes.data.candidateId);

                if (appRes.data.jobPostingId) {
                    const jdRes = await getPostingById(appRes.data.jobPostingId);
                    setPosting(jdRes.data);
                }

                reset({
                    applicationId: o.applicationId,
                    salaryOffered: o.salaryOffered,
                    contractTypeId: o.contractTypeId,
                    startDate: o.startDate,
                    probationMonths: o.probationMonths ?? 0,
                    reportingManager: o.reportingManager ?? "",
                    workLocationId: o.workLocationId ?? null,
                    currency: o.currency ?? "VND",
                    payFrequency: o.payFrequency ?? "MONTHLY",
                    performanceBonus: o.performanceBonus ?? "",
                    annualLeaveDays: o.annualLeaveDays ?? 12,
                    benefits: o.benefits ?? "",
                    allowance: o.allowance ?? 0,
                    note: o.note ?? "",
                    candidateVisibleNote: o.candidateVisibleNote ?? "",
                    approverId: o.approverId,
                    responseDeadline: o.responseDeadline ?? null,
                });
                return;
            }

            // ── Tạo mới từ applicationId trên URL ────────────
            let jd: JobPostingResponse | null = null;
            let fixedAppId: number | undefined;

            if (applicationIdParam) {
                fixedAppId = Number(applicationIdParam);
                const appRes = await getApplicationById(fixedAppId);
                setApplication(appRes.data);
                loadCandidate(appRes.data.candidateId);

                if (appRes.data.jobPostingId) {
                    const jdRes = await getPostingById(appRes.data.jobPostingId);
                    jd = jdRes.data;
                    setPosting(jd);
                }
            }

            reset({
                applicationId: fixedAppId as number,
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
                approverId: undefined as unknown as number,
                responseDeadline: null,
            });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(
                axiosErr.response?.data?.message ?? "Không tải được dữ liệu đề nghị nhận việc",
            );
            navigate("/offers");
        } finally {
            setLoading(false);
        }
    }, [editingId, applicationIdParam, reset, message, navigate]);

    useEffect(() => {
        load();
    }, [load]);

    /* ── Cascade select (Phòng ban → Tin → Ứng viên) ───────── */

    const pickDepartment = async (value: number | null) => {
        setDepartmentId(value);
        setPostingId(null);
        setPostings([]);
        setApplications([]);
        setApplication(null);
        setPosting(null);
        setValue("applicationId", undefined as unknown as number);

        if (value == null) return;

        setLoadingPostings(true);
        try {
            const res = await getPostings({ size: 1000 });
            setPostings(res.data.content.filter((p) => p.departmentId === value));
        } catch {
            setPostings([]);
            message.error("Không tải được danh sách tin tuyển dụng");
        } finally {
            setLoadingPostings(false);
        }
    };

    const pickPosting = async (value: number | null) => {
        setPostingId(value);
        setApplications([]);
        setApplication(null);
        setValue("applicationId", undefined as unknown as number);

        const jd = postings.find((p) => p.id === value) ?? null;
        setPosting(jd);

        if (jd?.salaryMin != null) setValue("salaryOffered", jd.salaryMin);
        if (jd?.benefits) setValue("benefits", jd.benefits);

        if (value == null) return;

        setLoadingApplications(true);
        try {
            const res = await getApplications({
                jobPostingId: value,
                stageType: "OFFER",
                size: 1000,
            });
            setApplications(res.data.content);
        } catch {
            setApplications([]);
            message.error("Không tải được danh sách ứng viên");
        } finally {
            setLoadingApplications(false);
        }
    };

    /* ── Salary band warning ────────────────────────────────── */

    const salaryWarning = useMemo(() => {
        if (!posting || salaryOffered == null) return null;
        const { salaryMin, salaryMax } = posting;

        if (salaryMin != null && salaryOffered < salaryMin) {
            return `Mức lương đang thấp hơn khoảng đã đăng tuyển (${salaryRangeLabel(salaryMin, salaryMax)}).`;
        }
        if (salaryMax != null && salaryOffered > salaryMax) {
            return `Mức lương đang cao hơn khoảng đã đăng tuyển (${salaryRangeLabel(salaryMin, salaryMax)}).`;
        }
        return null;
    }, [posting, salaryOffered]);

    /* ── Persist ────────────────────────────────────────────── */

    const persist = async (data: OfferCreateFormValues) => {
        const payload = {
            salaryOffered: data.salaryOffered,
            contractTypeId: data.contractTypeId,
            startDate: data.startDate,
            probationMonths: data.probationMonths,
            reportingManager: data.reportingManager || null,
            workLocationId: data.workLocationId ?? null,
            currency: data.currency || "VND",
            payFrequency: data.payFrequency || "MONTHLY",
            performanceBonus: data.performanceBonus || null,
            annualLeaveDays: data.annualLeaveDays ?? null,
            benefits: data.benefits || null,
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

        const res = await createOffer({ ...payload, applicationId: data.applicationId });
        return res.data.id;
    };

    const onSaveDraft = handleSubmit(async (data) => {
        setSaving(true);
        try {
            const offerId = await persist(data);
            message.success("Đã lưu bản nháp");
            navigate(`/offers/${offerId}`);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Lưu bản nháp thất bại");
        } finally {
            setSaving(false);
        }
    });

    const onSubmitForApproval = handleSubmit(async (data) => {
        setSaving(true);
        try {
            const offerId = await persist(data);
            await submitOffer(offerId);
            message.success("Đã gửi đề nghị vào luồng duyệt");
            navigate(`/offers/${offerId}`);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Gửi duyệt thất bại");
        } finally {
            setSaving(false);
        }
    });

    /* ── Derived ────────────────────────────────────────────── */

    if (loading) {
        return (
            <div className="page-shell" style={{ display: "flex", justifyContent: "center", padding: 64 }}>
                <Spin size="large" />
            </div>
        );
    }

    const candidateName = application?.candidateName ?? "";
    const departmentName =
        posting?.departmentName ??
        application?.departmentName ??
        nameOf(departments, posting?.departmentId ?? application?.departmentId ?? departmentId);

    const readyToCompose = hasFixedApplication || !!application;

    /* ── Render ─────────────────────────────────────────────── */

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                className="page-shell-fixed"
                title={`${editingId ? "Chỉnh sửa đề nghị nhận việc" : "Tạo đề nghị nhận việc"}${candidateName ? ` – ${candidateName}` : ""
                    }`}
                actions={
                    <>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                            Hủy
                        </Button>
                        <Button
                            icon={<SaveOutlined />}
                            loading={saving}
                            disabled={!readyToCompose}
                            onClick={onSaveDraft}
                        >
                            Lưu nháp
                        </Button>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            loading={saving}
                            disabled={!readyToCompose}
                            onClick={onSubmitForApproval}
                        >
                            Gửi duyệt
                        </Button>
                    </>
                }
            />

            <div className="page-shell-scroll">
                {/* ════════════════════════════════════════════
                 * BƯỚC 0 – Chọn vị trí (chỉ khi tạo mới tự do)
                 * ════════════════════════════════════════════ */}
                {!hasFixedApplication && (
                    <Card
                        size="small"
                        title="Chọn vị trí cần gửi đề nghị"
                        style={{ marginBottom: 16, borderRadius: 12 }}
                    >
                        <Form layout="vertical" component={false}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                    gap: 16,
                                }}
                            >
                                <Form.Item label="1. Phòng ban" required style={{ marginBottom: 0 }}>
                                    <Select
                                        allowClear
                                        value={departmentId ?? undefined}
                                        onChange={(v) => pickDepartment(v ?? null)}
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn phòng ban"
                                        options={departments.map((d) => ({
                                            value: d.id,
                                            label: String(d.name),
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item label="2. Tin tuyển dụng" required style={{ marginBottom: 0 }}>
                                    <Select
                                        allowClear
                                        value={postingId ?? undefined}
                                        onChange={(v) => pickPosting(v ?? null)}
                                        disabled={departmentId == null}
                                        loading={loadingPostings}
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={
                                            departmentId == null
                                                ? "Chọn phòng ban trước"
                                                : "Chọn tin tuyển dụng"
                                        }
                                        notFoundContent="Phòng ban này chưa có tin tuyển dụng nào"
                                        options={postings.map((p) => ({
                                            value: p.id,
                                            label: p.title,
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="3. Ứng viên"
                                    required
                                    validateStatus={errors.applicationId ? "error" : ""}
                                    help={errors.applicationId?.message}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Controller
                                        name="applicationId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onChange={(v) => {
                                                    field.onChange(v);
                                                    const picked =
                                                        applications.find((a) => a.id === v) ?? null;
                                                    setApplication(picked);
                                                    loadCandidate(picked?.candidateId);
                                                }}
                                                disabled={postingId == null}
                                                loading={loadingApplications}
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder={
                                                    postingId == null
                                                        ? "Chọn tin tuyển dụng trước"
                                                        : "Chọn ứng viên"
                                                }
                                                notFoundContent="Tin này chưa có ứng viên nào ở vòng Đề nghị"
                                                options={applications.map((a) => ({
                                                    value: a.id,
                                                    label: a.candidateName,
                                                }))}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </div>
                        </Form>
                    </Card>
                )}

                {/* ════════════════════════════════════════════
                 * Chưa chọn xong → Empty state
                 * ════════════════════════════════════════════ */}
                {!readyToCompose ? (
                    <Card size="small" style={{ borderRadius: 12 }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Chọn phòng ban, tin tuyển dụng và ứng viên để bắt đầu soạn đề nghị"
                        />
                    </Card>
                ) : (
                    <Form layout="vertical">
                        {/* ── 1. Thông tin ứng viên ───────────────────── */}
                        <SectionCard step={1} title="Thông tin ứng viên">
                            <div style={GRID}>
                                <ReadOnlyField label="Họ và tên" value={candidateName} />
                                <ReadOnlyField label="Email" value={candidate?.email ?? "—"} />
                                <ReadOnlyField label="Số điện thoại" value={candidate?.phone ?? "—"} />
                                <ReadOnlyField
                                    label="Nguồn ứng viên"
                                    value={application?.recruitmentSourceName ?? "—"}
                                />
                                <ReadOnlyField label="Tin tuyển dụng" value={posting?.title ?? "—"} />
                                <ReadOnlyField
                                    label="Giai đoạn hiện tại"
                                    value={application?.currentStageName ?? "—"}
                                />
                            </div>
                        </SectionCard>

                        {/* ── 2. Vị trí đăng tuyển (JD) ───────────────── */}
                        {posting && (
                            <SectionCard
                                step={2}
                                title="Vị trí đăng tuyển"
                                extra={<Tag color="blue">Theo tin tuyển dụng đã đăng</Tag>}
                            >
                                <div style={GRID}>
                                    <ReadOnlyField label="Vị trí" value={posting.title} />
                                    <ReadOnlyField label="Phòng ban" value={departmentName} />
                                    <ReadOnlyField
                                        label="Loại hình"
                                        value={nameOf(employmentTypes, posting.employmentTypeId)}
                                    />
                                    <ReadOnlyField
                                        label="Địa điểm"
                                        value={nameOf(workLocations, posting.workLocationId)}
                                    />
                                    <ReadOnlyField
                                        label="Hình thức làm việc"
                                        value={
                                            posting.workArrangement
                                                ? WORK_ARRANGEMENT_LABEL[posting.workArrangement] ??
                                                posting.workArrangement
                                                : "—"
                                        }
                                    />
                                    <ReadOnlyField
                                        label="Khoảng lương đã đăng"
                                        value={
                                            posting.salaryMin != null || posting.salaryMax != null
                                                ? salaryRangeLabel(posting.salaryMin, posting.salaryMax)
                                                : "Không công bố"
                                        }
                                    />
                                </div>

                                {posting.benefits && (
                                    <div style={{ marginTop: 16 }}>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: COLORS.textSecondary,
                                                marginBottom: 4,
                                            }}
                                        >
                                            Phúc lợi theo tin đăng
                                        </div>
                                        <div
                                            style={{
                                                background: "#F9FAFB",
                                                borderRadius: 8,
                                                padding: "10px 12px",
                                                fontSize: 13,
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            {posting.benefits}
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        )}

                        {/* ── 3. Thông tin vị trí (có thể chỉnh) ──────── */}
                        <SectionCard step={3} title="Thông tin vị trí">
                            <div style={GRID}>
                                <ReadOnlyField label="Chức danh" value={posting?.title ?? "—"} />
                                <ReadOnlyField label="Phòng ban" value={departmentName} />

                                <Form.Item label="Người quản lý trực tiếp" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="reportingManager"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                placeholder="Trần Văn B — Trưởng phòng Kỹ thuật"
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item label="Địa điểm làm việc" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="workLocationId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                allowClear
                                                value={field.value ?? undefined}
                                                onChange={(v) => field.onChange(v ?? null)}
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder="Chọn địa điểm"
                                                options={workLocations.map((w) => ({
                                                    value: w.id,
                                                    label: String(w.name),
                                                }))}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Loại hình hợp đồng"
                                    required
                                    validateStatus={errors.contractTypeId ? "error" : ""}
                                    help={errors.contractTypeId?.message}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Controller
                                        name="contractTypeId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onChange={field.onChange}
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder="Chọn loại hợp đồng"
                                                options={contractTypes.map((c) => ({
                                                    value: c.id,
                                                    label: String(c.name),
                                                }))}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Ngày bắt đầu làm việc"
                                    required
                                    validateStatus={errors.startDate ? "error" : ""}
                                    help={errors.startDate?.message}
                                    style={{ marginBottom: 0 }}
                                >
                                    <Controller
                                        name="startDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                style={{ width: "100%" }}
                                                format="DD/MM/YYYY"
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(d) =>
                                                    field.onChange(d ? d.format("YYYY-MM-DD") : "")
                                                }
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </div>
                        </SectionCard>

                        {/* ── 4. Lương & phúc lợi ─────────────────────── */}
                        <SectionCard step={4} title="Lương và phúc lợi">
                            {salaryWarning && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                    message="Lệch khoảng lương đã đăng tuyển"
                                    description={`${salaryWarning} Ứng viên đã đọc khoảng lương này khi nộp hồ sơ — hãy chắc chắn trước khi gửi duyệt.`}
                                />
                            )}

                            <div style={GRID}>
                                <Form.Item
                                    label="Lương cơ bản (Gross)"
                                    required
                                    validateStatus={errors.salaryOffered ? "error" : ""}
                                    help={errors.salaryOffered?.message}
                                    style={{ marginBottom: 0 }}
                                >
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <Controller
                                            name="salaryOffered"
                                            control={control}
                                            render={({ field }) => (
                                                <InputNumber
                                                    style={{ flex: 1 }}
                                                    min={0}
                                                    step={1_000_000}
                                                    value={field.value}
                                                    onChange={(v) => field.onChange(v ?? 0)}
                                                    formatter={(v) =>
                                                        `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                                                    }
                                                    parser={(v) =>
                                                        Number((v ?? "").replace(/\./g, ""))
                                                    }
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="currency"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    style={{ width: 96 }}
                                                    value={field.value ?? "VND"}
                                                    onChange={field.onChange}
                                                    options={[
                                                        { value: "VND", label: "VND" },
                                                        { value: "USD", label: "USD" },
                                                    ]}
                                                />
                                            )}
                                        />
                                    </div>
                                </Form.Item>

                                <Form.Item label="Hình thức trả lương" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="payFrequency"
                                        control={control}
                                        render={({ field }) => (
                                            <Radio.Group
                                                value={field.value ?? "MONTHLY"}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                optionType="button"
                                                buttonStyle="solid"
                                                options={[
                                                    { value: "MONTHLY", label: "Theo tháng" },
                                                    { value: "YEARLY", label: "Theo năm" },
                                                ]}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item label="Thưởng hiệu suất" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="performanceBonus"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                placeholder="10–15% lương năm"
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item label="Số ngày phép năm" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="annualLeaveDays"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                style={{ width: "100%" }}
                                                min={0}
                                                value={field.value ?? undefined}
                                                onChange={(v) => field.onChange(v ?? null)}
                                                addonAfter="ngày"
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item label="Phụ cấp (VNĐ)" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="allowance"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                style={{ width: "100%" }}
                                                min={0}
                                                step={500_000}
                                                value={field.value ?? 0}
                                                onChange={(v) => field.onChange(v ?? 0)}
                                                formatter={(v) =>
                                                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                                                }
                                                parser={(v) =>
                                                    Number((v ?? "").replace(/\./g, ""))
                                                }
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </div>

                            <Form.Item
                                label="Phúc lợi được áp dụng"
                                extra="Điền sẵn từ tin tuyển dụng; sửa lại nếu đề nghị này có thỏa thuận riêng."
                                style={{ marginTop: 16, marginBottom: 0 }}
                            >
                                <Controller
                                    name="benefits"
                                    control={control}
                                    render={({ field }) => {
                                        const { checked, other } = splitBenefits(field.value);
                                        return (
                                            <>
                                                <Checkbox.Group
                                                    value={checked}
                                                    onChange={(v) =>
                                                        field.onChange(
                                                            joinBenefits(v as string[], other),
                                                        )
                                                    }
                                                    style={{
                                                        display: "grid",
                                                        gridTemplateColumns:
                                                            "repeat(auto-fit, minmax(200px, 1fr))",
                                                        gap: 8,
                                                    }}
                                                    options={STANDARD_BENEFITS.map((b) => ({
                                                        label: b,
                                                        value: b,
                                                    }))}
                                                />
                                                <Input
                                                    style={{ marginTop: 10 }}
                                                    value={other}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            joinBenefits(checked, e.target.value),
                                                        )
                                                    }
                                                    placeholder="Phúc lợi khác — ngăn cách bằng dấu ·"
                                                />
                                            </>
                                        );
                                    }}
                                />
                            </Form.Item>
                        </SectionCard>

                        {/* ── 5. Điều khoản & ghi chú ─────────────────── */}
                        <SectionCard step={5} title="Điều khoản và ghi chú">
                            <div style={GRID}>
                                <Form.Item label="Thời gian thử việc" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="probationMonths"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                style={{ width: "100%" }}
                                                min={0}
                                                max={6}
                                                value={field.value}
                                                onChange={(v) => field.onChange(v ?? 0)}
                                                addonAfter="tháng"
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item label="Ngày hết hạn đề nghị" style={{ marginBottom: 0 }}>
                                    <Controller
                                        name="responseDeadline"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                showTime
                                                style={{ width: "100%" }}
                                                format="HH:mm DD/MM/YYYY"
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(d) =>
                                                    field.onChange(d ? d.toISOString() : null)
                                                }
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Người duyệt (HR hoặc Company Admin)"
                                    required
                                    validateStatus={errors.approverId ? "error" : ""}
                                    help={errors.approverId?.message}
                                    style={{ gridColumn: "1 / -1", marginBottom: 0 }}
                                >
                                    <Controller
                                        name="approverId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onChange={field.onChange}
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder="Chọn người duyệt"
                                                options={approvers.map((u) => ({
                                                    value: u.id,
                                                    label: u.fullName,
                                                }))}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </div>

                            <Form.Item
                                label="Điều kiện kèm theo"
                                extra="Nội dung này được in trên thư mời nhận việc mà ứng viên đọc được."
                                style={{ marginTop: 16 }}
                            >
                                <Controller
                                    name="candidateVisibleNote"
                                    control={control}
                                    render={({ field }) => (
                                        <Input.TextArea
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            rows={2}
                                            placeholder="Đề nghị có hiệu lực sau khi ứng viên hoàn thành kiểm tra lý lịch và ký thỏa thuận bảo mật."
                                        />
                                    )}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Ghi chú nội bộ"
                                extra="Chỉ HR và Company Admin đọc được. Không gửi cho ứng viên."
                                style={{ marginBottom: 0 }}
                            >
                                <Controller
                                    name="note"
                                    control={control}
                                    render={({ field }) => (
                                        <Input.TextArea
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            rows={2}
                                            placeholder="Căn cứ chọn ứng viên, khoảng lương còn thương lượng được…"
                                        />
                                    )}
                                />
                            </Form.Item>
                        </SectionCard>

                        {/* ── 6. Tóm tắt ──────────────────────────────── */}
                        <SectionCard step="✓" title="Tóm tắt đề nghị">
                            <div style={GRID}>
                                <ReadOnlyField label="Ứng viên" value={candidateName} />
                                <ReadOnlyField label="Vị trí" value={posting?.title ?? "—"} />
                                <ReadOnlyField
                                    label="Lương"
                                    value={
                                        draft.salaryOffered
                                            ? `${formatMoney(draft.salaryOffered)} ${draft.currency ?? "VND"
                                            } / ${PAY_FREQUENCY_LABEL[draft.payFrequency ?? "MONTHLY"]
                                            }`
                                            : "—"
                                    }
                                />
                                <ReadOnlyField
                                    label="Ngày bắt đầu"
                                    value={
                                        draft.startDate
                                            ? dayjs(draft.startDate).format("DD/MM/YYYY")
                                            : "—"
                                    }
                                />
                                <ReadOnlyField
                                    label="Địa điểm"
                                    value={nameOf(workLocations, draft.workLocationId)}
                                />
                                <ReadOnlyField
                                    label="Thử việc"
                                    value={
                                        draft.probationMonths
                                            ? `${draft.probationMonths} tháng`
                                            : "Không thử việc"
                                    }
                                />
                                <ReadOnlyField
                                    label="Ngày phép"
                                    value={
                                        draft.annualLeaveDays != null
                                            ? `${draft.annualLeaveDays} ngày/năm`
                                            : "—"
                                    }
                                />
                                <ReadOnlyField
                                    label="Hạn phản hồi"
                                    value={
                                        draft.responseDeadline
                                            ? dayjs(draft.responseDeadline).format(
                                                "HH:mm DD/MM/YYYY",
                                            )
                                            : "—"
                                    }
                                />
                            </div>
                        </SectionCard>
                    </Form>
                )}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
 * Sub-components
 * ────────────────────────────────────────────────────────────── */

function SectionCard({
    step,
    title,
    extra,
    children,
}: {
    step: number | string;
    title: string;
    extra?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Card
            size="small"
            style={{ marginBottom: 16, borderRadius: 12 }}
            title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: `${COLORS.primary}14`,
                            color: COLORS.primary,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        {step}
                    </span>
                    {title}
                </span>
            }
            extra={extra}
        >
            {children}
        </Card>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontWeight: 500 }}>{value || "—"}</div>
        </div>
    );
}