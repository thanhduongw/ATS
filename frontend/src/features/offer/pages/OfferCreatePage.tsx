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
import { formatMoney, moneyFormatter, moneyParser } from "../../../app/money";

/* ──────────────────────────────────────────────────────────────
 * Hằng số & tiện ích
 * ────────────────────────────────────────────────────────────── */

const WORK_ARRANGEMENT_LABEL: Record<string, string> = {
    ONSITE: "Tại văn phòng",
    HYBRID: "Kết hợp",
    REMOTE: "Từ xa",
};

const PAY_FREQUENCY_SUFFIX: Record<string, string> = {
    MONTHLY: "/tháng",
    YEARLY: "/năm",
};

/**
 * Phúc lợi vẫn lưu thành một chuỗi như cũ để không phải đổi lược đồ; giao diện chỉ tách
 * chuỗi đó ra thành các ô tick cho nhanh, phần nào không nằm trong danh sách chuẩn thì
 * rơi vào ô "phúc lợi khác" (kể cả đoạn phúc lợi dài chép sang từ tin tuyển dụng).
 */
const STANDARD_BENEFITS = [
    "Bảo hiểm xã hội, y tế, thất nghiệp",
    "Bảo hiểm sức khỏe",
    "Lương tháng 13",
    "Thưởng lễ, Tết",
    "Laptop công ty cấp",
    "Phụ cấp ăn trưa",
    "Phụ cấp đi lại",
    "Khám sức khỏe định kỳ",
];

const BENEFIT_SEPARATOR = " · ";

/** Tỷ lệ lương thử việc tối thiểu theo Bộ luật Lao động 2019. */
const PROBATION_MIN_RATE = 0.85;

/* ── Lưới bố cục ───────────────────────────────────────────── */

/** Ô nhập rộng: mỗi hàng tối đa 2 cột trong khung 1120px, mỗi ô khoảng 550px. */
const GRID_FIELDS: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: "20px 24px",
};

/** Lưới thông tin chỉ đọc — chữ ngắn nên xếp được nhiều cột hơn. */
const GRID_INFO: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px 24px",
};

/** Ô chiếm trọn chiều ngang: phúc lợi, ghi chú, dòng lương. */
const FULL: React.CSSProperties = { gridColumn: "1 / -1" };

/* ── Hàm tiện ích ──────────────────────────────────────────── */

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

const nameOf = (items: CatalogItem[], id?: number | null) =>
    items.find((c) => c.id === id)?.name?.toString() ?? "—";

const salaryRangeLabel = (min?: number | null, max?: number | null) =>
    `${min != null ? formatMoney(min) : "…"} – ${max != null ? formatMoney(max) : "…"}`;

/* ──────────────────────────────────────────────────────────────
 * Trang
 * ────────────────────────────────────────────────────────────── */

export default function OfferCreatePage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { message } = App.useApp();

    const editingId = id ? Number(id) : null;
    const applicationIdParam = searchParams.get("applicationId");
    const hasFixedApplication = !!editingId || !!applicationIdParam;

    /* ── State ──────────────────────────────────────────────── */
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    /** Email và số điện thoại không nằm trong hồ sơ ứng tuyển, phải lấy từ hồ sơ ứng viên. */
    const [candidate, setCandidate] = useState<CandidateResponse | null>(null);
    const [posting, setPosting] = useState<JobPostingResponse | null>(null);

    const [approvers, setApprovers] = useState<UserDirectoryResponse[]>([]);
    const [contractTypes, setContractTypes] = useState<CatalogItem[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);

    // Cascade select (chỉ dùng khi tạo mới tự do)
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

    /** Dùng cho cảnh báo lệch khoảng lương và cho ô tóm tắt — cập nhật theo từng phím gõ. */
    const draft = useWatch({ control });
    const salaryOffered = draft.salaryOffered;

    /* ── Nạp dữ liệu ────────────────────────────────────────── */
    const loadCandidate = async (candidateId?: number | null) => {
        setCandidate(null);
        if (candidateId == null) return;
        try {
            const res = await getCandidateById(candidateId);
            setCandidate(res.data);
        } catch {
            // Thiếu email/SĐT thì để trống chứ không chặn việc soạn đề nghị.
        }
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [ctRes, hrRes, adminRes, deptRes, locRes] = await Promise.all([
                getCatalogItems("/masterdata/contract-types"),
                getUserDirectory("RECRUITER"),
                getUserDirectory("COMPANY_ADMIN"),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/work-locations"),
            ]);

            setContractTypes(ctRes.data.filter((c) => c.active !== false));
            setDepartments(deptRes.data);
            setWorkLocations(locRes.data);
            setApprovers(
                Array.from(
                    new Map([...hrRes.data, ...adminRes.data].map((u) => [u.id, u])).values(),
                ),
            );

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

    /* ── Chọn dần phòng ban → tin → ứng viên ────────────────── */
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

        // Điền sẵn theo tin tuyển dụng để HR chỉ phải sửa phần thỏa thuận riêng.
        if (jd?.salaryMin != null) setValue("salaryOffered", jd.salaryMin);
        if (jd?.benefits) setValue("benefits", jd.benefits);
        if (jd?.workLocationId != null) setValue("workLocationId", jd.workLocationId);

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

    /* ── Cảnh báo lệch khoảng lương đã đăng ─────────────────── */
    const salaryWarning = useMemo(() => {
        if (!posting || salaryOffered == null) return null;
        const { salaryMin, salaryMax } = posting;
        if (salaryMin != null && salaryOffered < salaryMin) {
            return `Thấp hơn khoảng đã đăng (${salaryRangeLabel(salaryMin, salaryMax)}).`;
        }
        if (salaryMax != null && salaryOffered > salaryMax) {
            return `Cao hơn khoảng đã đăng (${salaryRangeLabel(salaryMin, salaryMax)}).`;
        }
        return null;
    }, [posting, salaryOffered]);

    /* ── Lưu ────────────────────────────────────────────────── */
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

    /* ── Giá trị dẫn xuất ───────────────────────────────────── */
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

    const currency = draft.currency ?? "VND";
    const paySuffix = PAY_FREQUENCY_SUFFIX[draft.payFrequency ?? "MONTHLY"] ?? "";
    const benefitTags = splitBenefits(draft.benefits).checked;

    /** Lương thử việc tối thiểu — chỉ là gợi ý để HR ghi đúng vào điều khoản, không lưu lại. */
    const probationFloor =
        draft.probationMonths && salaryOffered
            ? formatMoney(Math.round(salaryOffered * PROBATION_MIN_RATE))
            : null;

    /** Thu nhập hằng tháng gồm lương và phụ cấp — con số ứng viên thật sự quan tâm. */
    const monthlyTotal =
        draft.payFrequency !== "YEARLY" && salaryOffered
            ? salaryOffered + (draft.allowance ?? 0)
            : null;

    /* ── Giao diện ──────────────────────────────────────────── */
    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                className="page-shell-fixed"
                title={`${editingId ? "Chỉnh sửa đề nghị" : "Tạo đề nghị nhận việc"}${candidateName ? ` – ${candidateName}` : ""
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
                {/* Khung hẹp lại so với bề ngang trang: mỗi hàng chỉ 2 ô nên ô nhập rộng hẳn ra. */}
                <div style={{ maxWidth: 1120, margin: "0 auto" }}>
                    {/* ── Chọn vị trí (chỉ khi tạo mới tự do) ───── */}
                    {!hasFixedApplication && (
                        <Card
                            size="small"
                            title="Chọn vị trí & ứng viên"
                            style={{ marginBottom: 16, borderRadius: 12 }}
                        >
                            <div style={GRID_FIELDS}>
                                <Form.Item label="Phòng ban" required style={{ marginBottom: 0 }}>
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

                                <Form.Item label="Tin tuyển dụng" required style={{ marginBottom: 0 }}>
                                    <Select
                                        allowClear
                                        value={postingId ?? undefined}
                                        onChange={(v) => pickPosting(v ?? null)}
                                        disabled={departmentId == null}
                                        loading={loadingPostings}
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={departmentId == null ? "Chọn phòng ban trước" : "Chọn tin"}
                                        notFoundContent="Chưa có tin tuyển dụng"
                                        options={postings.map((p) => ({ value: p.id, label: p.title }))}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Ứng viên"
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
                                                    const picked = applications.find((a) => a.id === v) ?? null;
                                                    setApplication(picked);
                                                    loadCandidate(picked?.candidateId);
                                                }}
                                                disabled={postingId == null}
                                                loading={loadingApplications}
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder={postingId == null ? "Chọn tin trước" : "Chọn ứng viên"}
                                                notFoundContent="Chưa có ứng viên ở vòng Đề nghị"
                                                options={applications.map((a) => ({
                                                    value: a.id,
                                                    label: a.candidateName,
                                                }))}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </div>
                        </Card>
                    )}

                    {!readyToCompose ? (
                        <Card size="small" style={{ borderRadius: 12 }}>
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Chọn phòng ban → tin tuyển dụng → ứng viên để bắt đầu"
                            />
                        </Card>
                    ) : (
                        <Form layout="vertical">
                            {/* ── 1. Ứng viên & vị trí ứng tuyển ───────── */}
                            <SectionCard step={1} title="Ứng viên & vị trí ứng tuyển">
                                <div style={GRID_INFO}>
                                    <ReadOnlyField label="Họ và tên" value={candidateName} />
                                    <ReadOnlyField label="Email" value={candidate?.email ?? "—"} />
                                    <ReadOnlyField label="Số điện thoại" value={candidate?.phone ?? "—"} />
                                    <ReadOnlyField
                                        label="Nguồn ứng viên"
                                        value={application?.recruitmentSourceName ?? "—"}
                                    />
                                    <ReadOnlyField label="Tin tuyển dụng" value={posting?.title ?? "—"} />
                                    <ReadOnlyField label="Phòng ban" value={departmentName} />
                                    <ReadOnlyField
                                        label="Khoảng lương đã đăng"
                                        value={
                                            posting?.salaryMin != null || posting?.salaryMax != null
                                                ? salaryRangeLabel(posting.salaryMin, posting.salaryMax)
                                                : "Không công bố"
                                        }
                                    />
                                    <ReadOnlyField
                                        label="Hình thức làm việc"
                                        value={
                                            posting?.workArrangement
                                                ? WORK_ARRANGEMENT_LABEL[posting.workArrangement] ??
                                                posting.workArrangement
                                                : "—"
                                        }
                                    />
                                </div>
                            </SectionCard>

                            {/* ── 2. Công việc ─────────────────────────── */}
                            <SectionCard step={2} title="Công việc">
                                <div style={GRID_FIELDS}>
                                    <Form.Item label="Người quản lý trực tiếp" style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="reportingManager"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    placeholder="Nguyễn Văn A — Trưởng phòng Kỹ thuật"
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
                                        label="Loại hợp đồng"
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
                                        label="Ngày bắt đầu dự kiến"
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
                                                    placeholder="Chọn ngày"
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

                            {/* ── 3. Lương & phúc lợi ──────────────────── */}
                            <SectionCard step={3} title="Lương & phúc lợi">
                                {salaryWarning && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        style={{ marginBottom: 20 }}
                                        message="Lệch khoảng lương đã đăng"
                                        description={salaryWarning}
                                    />
                                )}

                                <div style={GRID_FIELDS}>
                                    {/* Lương, đơn vị tiền và chu kỳ trả là một thỏa thuận, để chung một dòng. */}
                                    <Form.Item
                                        label="Lương Gross"
                                        required
                                        validateStatus={errors.salaryOffered ? "error" : ""}
                                        help={errors.salaryOffered?.message}
                                        style={{ ...FULL, marginBottom: 0 }}
                                    >
                                        <div style={{ display: "flex", gap: 10 }}>
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
                                                        formatter={moneyFormatter}
                                                        parser={moneyParser}
                                                    />
                                                )}
                                            />
                                            <Controller
                                                name="currency"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select
                                                        style={{ width: 110 }}
                                                        value={field.value ?? "VND"}
                                                        onChange={field.onChange}
                                                        options={[
                                                            { value: "VND", label: "VND" },
                                                            { value: "USD", label: "USD" },
                                                        ]}
                                                    />
                                                )}
                                            />
                                            <Controller
                                                name="payFrequency"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select
                                                        style={{ width: 150 }}
                                                        value={field.value ?? "MONTHLY"}
                                                        onChange={field.onChange}
                                                        options={[
                                                            { value: "MONTHLY", label: "Theo tháng" },
                                                            { value: "YEARLY", label: "Theo năm" },
                                                        ]}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </Form.Item>

                                    <Form.Item label="Phụ cấp hằng tháng" style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="allowance"
                                            control={control}
                                            render={({ field }) => (
                                                <InputNumber
                                                    style={{ width: "100%" }}
                                                    min={0}
                                                    step={500_000}
                                                    value={field.value}
                                                    onChange={(v) => field.onChange(v ?? 0)}
                                                    formatter={moneyFormatter}
                                                    parser={moneyParser}
                                                    placeholder="Ăn trưa, xăng xe, điện thoại…"
                                                />
                                            )}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Thưởng hiệu suất"
                                        extra="Thường thỏa thuận theo tỷ lệ nên để dạng chữ."
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="performanceBonus"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    placeholder="10–15% lương năm, xét theo kết quả quý"
                                                />
                                            )}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Thời gian thử việc"
                                        extra={
                                            probationFloor
                                                ? `Lương thử việc tối thiểu theo luật (85%): ${probationFloor}`
                                                : undefined
                                        }
                                        style={{ marginBottom: 0 }}
                                    >
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

                                    <Form.Item label="Số ngày phép năm" style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="annualLeaveDays"
                                            control={control}
                                            render={({ field }) => (
                                                <InputNumber
                                                    style={{ width: "100%" }}
                                                    min={0}
                                                    max={40}
                                                    value={field.value}
                                                    onChange={(v) => field.onChange(v ?? null)}
                                                    addonAfter="ngày"
                                                />
                                            )}
                                        />
                                    </Form.Item>

                                    <Form.Item label="Phúc lợi" style={{ ...FULL, marginBottom: 0 }}>
                                        <Controller
                                            name="benefits"
                                            control={control}
                                            render={({ field }) => {
                                                const { checked, other } = splitBenefits(field.value);
                                                const allChecked = checked.length === STANDARD_BENEFITS.length;
                                                return (
                                                    <>
                                                        <Checkbox
                                                            checked={allChecked}
                                                            indeterminate={checked.length > 0 && !allChecked}
                                                            onChange={(e) =>
                                                                field.onChange(joinBenefits(
                                                                    e.target.checked ? STANDARD_BENEFITS : [],
                                                                    other,
                                                                ))
                                                            }
                                                            style={{ marginBottom: 12, fontWeight: 500 }}
                                                        >
                                                            Chọn tất cả
                                                        </Checkbox>
                                                        <Checkbox.Group
                                                            value={checked}
                                                            onChange={(v) =>
                                                                field.onChange(joinBenefits(v as string[], other))
                                                            }
                                                            style={{
                                                                display: "grid",
                                                                gridTemplateColumns:
                                                                    "repeat(auto-fit, minmax(250px, 1fr))",
                                                                gap: 10,
                                                            }}
                                                            options={STANDARD_BENEFITS.map((b) => ({
                                                                label: b,
                                                                value: b,
                                                            }))}
                                                        />
                                                        <Input.TextArea
                                                            style={{ marginTop: 12 }}
                                                            rows={8}
                                                            value={other}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    joinBenefits(checked, e.target.value),
                                                                )
                                                            }
                                                            placeholder="Phúc lợi khác thỏa thuận riêng…"
                                                        />
                                                    </>
                                                );
                                            }}
                                        />
                                    </Form.Item>
                                </div>
                            </SectionCard>

                            {/* ── 4. Điều khoản & phê duyệt ────────────── */}
                            <SectionCard step={4} title="Điều khoản & phê duyệt">
                                <div style={GRID_FIELDS}>
                                    <Form.Item
                                        label="Hạn phản hồi đề nghị"
                                        extra="Quá hạn này ứng viên không bấm chấp nhận được nữa."
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="responseDeadline"
                                            control={control}
                                            render={({ field }) => (
                                                <DatePicker
                                                    showTime
                                                    style={{ width: "100%" }}
                                                    format="HH:mm DD/MM/YYYY"
                                                    placeholder="Chọn thời hạn"
                                                    value={field.value ? dayjs(field.value) : null}
                                                    onChange={(d) => field.onChange(d ? d.toISOString() : null)}
                                                />
                                            )}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Người duyệt"
                                        required
                                        validateStatus={errors.approverId ? "error" : ""}
                                        help={errors.approverId?.message}
                                        style={{ marginBottom: 0 }}
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

                                    <Form.Item
                                        label="Điều kiện kèm theo"
                                        extra="Ứng viên đọc được phần này trong thư mời."
                                        style={{ ...FULL, marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="candidateVisibleNote"
                                            control={control}
                                            render={({ field }) => (
                                                <Input.TextArea
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    rows={6}
                                                    placeholder="Đề nghị có hiệu lực sau khi hoàn tất kiểm tra thông tin và ký cam kết bảo mật…"
                                                />
                                            )}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Ghi chú nội bộ"
                                        extra="Chỉ nhân sự và quản trị hệ thống đọc được, không gửi cho ứng viên."
                                        style={{ ...FULL, marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="note"
                                            control={control}
                                            render={({ field }) => (
                                                <Input.TextArea
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    rows={6}
                                                    placeholder="Lý do chốt mức lương này, điểm cần lưu ý khi thương lượng…"
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </div>
                            </SectionCard>

                            {/* ── Tóm tắt ──────────────────────────────── */}
                            <SectionCard step="✓" title="Tóm tắt đề nghị">
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "baseline",
                                        gap: 10,
                                        flexWrap: "wrap",
                                        paddingBottom: 16,
                                        marginBottom: 16,
                                        borderBottom: `1px solid ${COLORS.borderLight}`,
                                    }}
                                >
                                    <span style={{ fontSize: 26, fontWeight: 700, color: COLORS.primary }}>
                                        {salaryOffered ? formatMoney(salaryOffered) : "—"}
                                    </span>
                                    <span style={{ color: COLORS.textSecondary }}>
                                        {currency}
                                        {paySuffix}
                                    </span>
                                    {monthlyTotal != null && (draft.allowance ?? 0) > 0 && (
                                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                            · Gồm phụ cấp: <b>{formatMoney(monthlyTotal)}</b>/tháng
                                        </span>
                                    )}
                                </div>

                                <div style={GRID_INFO}>
                                    <ReadOnlyField label="Ứng viên" value={candidateName} />
                                    <ReadOnlyField label="Vị trí" value={posting?.title ?? "—"} />
                                    <ReadOnlyField
                                        label="Địa điểm làm việc"
                                        value={nameOf(workLocations, draft.workLocationId)}
                                    />
                                    <ReadOnlyField
                                        label="Quản lý trực tiếp"
                                        value={draft.reportingManager || "—"}
                                    />
                                    <ReadOnlyField
                                        label="Loại hợp đồng"
                                        value={nameOf(contractTypes, draft.contractTypeId)}
                                    />
                                    <ReadOnlyField
                                        label="Ngày bắt đầu"
                                        value={
                                            draft.startDate ? dayjs(draft.startDate).format("DD/MM/YYYY") : "—"
                                        }
                                    />
                                    <ReadOnlyField
                                        label="Thử việc"
                                        value={
                                            draft.probationMonths ? `${draft.probationMonths} tháng` : "Không"
                                        }
                                    />
                                    <ReadOnlyField
                                        label="Phép năm"
                                        value={
                                            draft.annualLeaveDays != null
                                                ? `${draft.annualLeaveDays} ngày`
                                                : "—"
                                        }
                                    />
                                    <ReadOnlyField
                                        label="Thưởng hiệu suất"
                                        value={draft.performanceBonus || "—"}
                                    />
                                    <ReadOnlyField
                                        label="Hạn phản hồi"
                                        value={
                                            draft.responseDeadline
                                                ? dayjs(draft.responseDeadline).format("HH:mm DD/MM/YYYY")
                                                : "—"
                                        }
                                    />
                                    <ReadOnlyField
                                        label="Người duyệt"
                                        value={
                                            approvers.find((u) => u.id === draft.approverId)?.fullName ?? "—"
                                        }
                                    />
                                </div>

                                {benefitTags.length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: COLORS.textSecondary,
                                                marginBottom: 6,
                                            }}
                                        >
                                            Phúc lợi
                                        </div>
                                        {benefitTags.map((b) => (
                                            <Tag key={b} color="green" style={{ marginBottom: 6 }}>
                                                {b}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>
                        </Form>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
 * Thành phần phụ
 * ────────────────────────────────────────────────────────────── */

function SectionCard({
    step,
    title,
    children,
}: {
    step: number | string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Card
            size="small"
            style={{ marginBottom: 16, borderRadius: 12 }}
            styles={{ body: { padding: 20 } }}
            title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: `${COLORS.primary}14`,
                            color: COLORS.primary,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        {step}
                    </span>
                    {title}
                </span>
            }
        >
            {children}
        </Card>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 }}>
                {label}
            </div>
            <div style={{ fontWeight: 500 }}>{value || "—"}</div>
        </div>
    );
}
