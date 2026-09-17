import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Alert, App, Button, Card, DatePicker, Empty, Form, Input, InputNumber,
    Select, Spin, Tag,
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
import type { ApplicationResponse } from "../../candidate/types";
import { getPostingById, getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import { COLORS } from "../../../app/theme";
import PageHeader from "../../../components/ui/PageHeader";
import { formatMoney } from "../../../app/money";

const WORK_ARRANGEMENT_LABEL: Record<string, string> = {
    ONSITE: "Tại văn phòng",
    HYBRID: "Kết hợp",
    REMOTE: "Từ xa",
};

const nameOf = (items: CatalogItem[], id?: number | null) => {
    const found = items.find((c) => c.id === id)?.name;
    return found == null ? "—" : String(found);
};

const salaryRangeLabel = (min?: number | null, max?: number | null) =>
    `${min != null ? formatMoney(min) : "…"} – ${max != null ? formatMoney(max) : "…"}`;

/**
 * Tao moi hoac sua offer dang ban nhap.
 *
 * Mo tu bang so sanh hoac chi tiet ho so thi ngu canh da day du, chi hien thi lai.
 * Mo tu nut "+ Tao de nghi" thi chon lan luot phong ban -> tin tuyen dung -> ung vien,
 * dung thu tu thuc te: phai biet tuyen cho vi tri nao roi moi noi toi ung vien nao.
 *
 * Moi truong hop offer deu neo vao JD da dang: phong ban, khoang luong va phuc loi
 * lay tu tin tuyen dung chu khong de HR go tu do.
 */
export default function OfferCreatePage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { message } = App.useApp();

    const editingId = id ? Number(id) : null;
    const applicationIdParam = searchParams.get("applicationId");
    /** Ngu canh da biet san ung vien — khong can buoc chon nao. */
    const hasFixedApplication = !!editingId || !!applicationIdParam;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [application, setApplication] = useState<ApplicationResponse | null>(null);
    const [posting, setPosting] = useState<JobPostingResponse | null>(null);
    const [approvers, setApprovers] = useState<UserDirectoryResponse[]>([]);
    const [contractTypes, setContractTypes] = useState<CatalogItem[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);

    // ── Ba buoc chon, chi dung khi mo tu nut "+ Tao de nghi" ──────────────────
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [postingId, setPostingId] = useState<number | null>(null);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loadingPostings, setLoadingPostings] = useState(false);
    const [loadingApplications, setLoadingApplications] = useState(false);

    const { control, handleSubmit, reset, setValue, formState: { errors } } =
        useForm<OfferCreateFormValues>({ resolver: zodResolver(offerCreateSchema) });

    const salaryOffered = useWatch({ control, name: "salaryOffered" });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Nguoi duyet offer la HR hoac Company Admin; hiring manager khong tham gia buoc nay.
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
                Array.from(new Map([...hrRes.data, ...adminRes.data].map((u) => [u.id, u])).values()),
            );

            if (editingId) {
                const offerRes = await getOfferById(editingId);
                const o = offerRes.data;
                const appRes = await getApplicationById(o.applicationId);
                setApplication(appRes.data);
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
                if (appRes.data.jobPostingId) {
                    const jdRes = await getPostingById(appRes.data.jobPostingId);
                    jd = jdRes.data;
                    setPosting(jd);
                }
            }

            reset({
                applicationId: fixedAppId as number,
                // Lay muc san trong khoang luong da dang thay vi mot con so bia dat.
                salaryOffered: jd?.salaryMin ?? 15000000,
                contractTypeId: undefined as unknown as number,
                startDate: "",
                probationMonths: 2,
                benefits: jd?.benefits ?? "",
                allowance: 0,
                note: "",
                candidateVisibleNote: "",
                approverId: undefined as unknown as number,
                responseDeadline: null,
            });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu đề nghị nhận việc");
            navigate("/offers");
        } finally {
            setLoading(false);
        }
    }, [editingId, applicationIdParam, reset, message, navigate]);

    useEffect(() => {
        load();
    }, [load]);

    /** Buoc 1 → 2: doi phong ban thi nap lai tin tuyen dung va bo het lua chon phia sau. */
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
            // API tin tuyen dung chua loc theo phong ban nen loc o day.
            const res = await getPostings({ size: 1000 });
            setPostings(res.data.content.filter((p) => p.departmentId === value));
        } catch {
            setPostings([]);
            message.error("Không tải được danh sách tin tuyển dụng");
        } finally {
            setLoadingPostings(false);
        }
    };

    /** Buoc 2 → 3: chot tin tuyen dung thi lay JD ve dien san va nap ho so o vong Offer. */
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
            const res = await getApplications({ jobPostingId: value, stageType: "OFFER", size: 1000 });
            setApplications(res.data.content);
        } catch {
            setApplications([]);
            message.error("Không tải được danh sách ứng viên");
        } finally {
            setLoadingApplications(false);
        }
    };

    /** Lương ngoài khoảng đã đăng là lệch với thứ ứng viên đã đọc, phải cảnh báo. */
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

    const persist = async (data: OfferCreateFormValues) => {
        const payload = {
            salaryOffered: data.salaryOffered,
            contractTypeId: data.contractTypeId,
            startDate: data.startDate,
            probationMonths: data.probationMonths,
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

    if (loading) {
        return (
            <div className="page-shell" style={{ display: "flex", justifyContent: "center", padding: 64 }}>
                <Spin />
            </div>
        );
    }

    const candidateName = application?.candidateName ?? "";
    const departmentName = posting?.departmentName
        ?? application?.departmentName
        ?? nameOf(departments, posting?.departmentId ?? application?.departmentId ?? departmentId);
    // Chua chon xong ung vien thi chua co gi de soan.
    const readyToCompose = hasFixedApplication || !!application;

    return (
        <div className="page-shell animate-fade-in">
            <PageHeader
                className="page-shell-fixed"
                title={`${editingId ? "Chỉnh sửa đề nghị nhận việc" : "Tạo đề nghị nhận việc"}${candidateName ? ` – ${candidateName}` : ""}`}
                actions={<>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Hủy</Button>
                    <Button icon={<SaveOutlined />} loading={saving} disabled={!readyToCompose} onClick={onSaveDraft}>
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
                </>}
            />

            <div className="page-shell-scroll">
                {hasFixedApplication ? (
                    <Card size="small" title="Hồ sơ ứng tuyển" style={{ marginBottom: 16, borderRadius: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                            <ReadOnlyField label="Phòng ban" value={departmentName} />
                            <ReadOnlyField label="Tin tuyển dụng" value={posting?.title ?? "—"} />
                            <ReadOnlyField label="Ứng viên" value={candidateName} />
                            <ReadOnlyField label="Giai đoạn hiện tại" value={application?.currentStageName ?? "—"} />
                        </div>
                    </Card>
                ) : (
                    <Card
                        size="small"
                        title="Chọn vị trí cần gửi đề nghị"
                        style={{ marginBottom: 16, borderRadius: 12 }}
                    >
                        <Form layout="vertical" component={false}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                                <Form.Item label="1. Phòng ban" required style={{ marginBottom: 0 }}>
                                    <Select
                                        allowClear
                                        value={departmentId ?? undefined}
                                        onChange={(v) => pickDepartment(v ?? null)}
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn phòng ban"
                                        options={departments.map((d) => ({ value: d.id, label: String(d.name) }))}
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
                                        placeholder={departmentId == null ? "Chọn phòng ban trước" : "Chọn tin tuyển dụng"}
                                        notFoundContent="Phòng ban này chưa có tin tuyển dụng nào"
                                        options={postings.map((p) => ({ value: p.id, label: p.title }))}
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
                                                    setApplication(applications.find((a) => a.id === v) ?? null);
                                                }}
                                                disabled={postingId == null}
                                                loading={loadingApplications}
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder={postingId == null ? "Chọn tin tuyển dụng trước" : "Chọn ứng viên"}
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

                {posting && (
                    <Card
                        size="small"
                        title="Vị trí đăng tuyển"
                        extra={<Tag color="blue">Theo tin tuyển dụng đã đăng</Tag>}
                        style={{ marginBottom: 16, borderRadius: 12 }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                            <ReadOnlyField label="Vị trí" value={posting.title} />
                            <ReadOnlyField label="Phòng ban" value={departmentName} />
                            <ReadOnlyField label="Loại hình" value={nameOf(employmentTypes, posting.employmentTypeId)} />
                            <ReadOnlyField label="Địa điểm" value={nameOf(workLocations, posting.workLocationId)} />
                            <ReadOnlyField
                                label="Hình thức làm việc"
                                value={posting.workArrangement
                                    ? WORK_ARRANGEMENT_LABEL[posting.workArrangement] ?? posting.workArrangement
                                    : "—"}
                            />
                            <ReadOnlyField
                                label="Khoảng lương đã đăng"
                                value={posting.salaryMin != null || posting.salaryMax != null
                                    ? salaryRangeLabel(posting.salaryMin, posting.salaryMax)
                                    : "Không công bố"}
                            />
                        </div>
                        {posting.benefits && (
                            <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>
                                    Phúc lợi theo tin đăng
                                </div>
                                <div style={{
                                    background: "#F9FAFB", borderRadius: 8, padding: "10px 12px",
                                    fontSize: 13, whiteSpace: "pre-wrap",
                                }}>
                                    {posting.benefits}
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {!readyToCompose ? (
                    <Card size="small" style={{ borderRadius: 12 }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Chọn phòng ban, tin tuyển dụng và ứng viên để bắt đầu soạn offer"
                        />
                    </Card>
                ) : (
                    <Card size="small" title="Nội dung đề nghị" style={{ borderRadius: 12 }}>
                        {salaryWarning && (
                            <Alert
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16 }}
                                message="Lệch khoảng lương đã đăng tuyển"
                                description={`${salaryWarning} Ứng viên đã đọc khoảng lương này khi nộp hồ sơ — hãy chắc chắn trước khi gửi duyệt.`}
                            />
                        )}

                        <Form layout="vertical">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0 20px" }}>
                                <Form.Item
                                    label="Mức lương đề xuất (VNĐ)"
                                    required
                                    validateStatus={errors.salaryOffered ? "error" : ""}
                                    help={errors.salaryOffered?.message}
                                >
                                    <Controller
                                        name="salaryOffered"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                value={field.value}
                                                onChange={(v) => field.onChange(v ?? undefined)}
                                                style={{ width: "100%" }}
                                                min={0}
                                                step={1000000}
                                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                parser={(v) => Number(v?.replace(/,/g, "") || 0)}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item label="Phụ cấp (VNĐ)">
                                    <Controller
                                        name="allowance"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                value={field.value ?? undefined}
                                                onChange={(v) => field.onChange(v)}
                                                style={{ width: "100%" }}
                                                min={0}
                                                step={500000}
                                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                parser={(v) => Number(v?.replace(/,/g, "") || 0)}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Loại hợp đồng"
                                    required
                                    validateStatus={errors.contractTypeId ? "error" : ""}
                                    help={errors.contractTypeId?.message}
                                >
                                    <Controller
                                        name="contractTypeId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Chọn loại hợp đồng"
                                                options={contractTypes.map((c) => ({ value: c.id, label: String(c.name) }))}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Thời gian thử việc (tháng)"
                                    validateStatus={errors.probationMonths ? "error" : ""}
                                    help={errors.probationMonths?.message}
                                >
                                    <Controller
                                        name="probationMonths"
                                        control={control}
                                        render={({ field }) => (
                                            <InputNumber
                                                value={field.value}
                                                onChange={(v) => field.onChange(v ?? 0)}
                                                min={0}
                                                max={12}
                                                style={{ width: "100%" }}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Ngày bắt đầu"
                                    required
                                    validateStatus={errors.startDate ? "error" : ""}
                                    help={errors.startDate?.message}
                                >
                                    <Controller
                                        name="startDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                style={{ width: "100%" }}
                                                format="DD/MM/YYYY"
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item label="Hạn phản hồi">
                                    <Controller
                                        name="responseDeadline"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                showTime
                                                style={{ width: "100%" }}
                                                format="HH:mm DD/MM/YYYY"
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(d) => field.onChange(d ? d.toISOString() : null)}
                                            />
                                        )}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Người duyệt (HR hoặc Company Admin)"
                                    required
                                    validateStatus={errors.approverId ? "error" : ""}
                                    help={errors.approverId?.message}
                                    style={{ gridColumn: "1 / -1" }}
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
                                                options={approvers.map((u) => ({ value: u.id, label: u.fullName }))}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </div>

                            <Form.Item
                                label="Phúc lợi"
                                extra="Điền sẵn từ tin tuyển dụng; sửa lại nếu đề nghị này có thỏa thuận riêng."
                            >
                                <Controller
                                    name="benefits"
                                    control={control}
                                    render={({ field }) => (
                                        <Input.TextArea
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            rows={2}
                                            placeholder="Laptop, phụ cấp ăn trưa, BHXH đầy đủ…"
                                        />
                                    )}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Ghi chú hiển thị cho ứng viên"
                                extra="Nội dung này được in trên thư mời nhận việc mà ứng viên đọc được."
                            >
                                <Controller
                                    name="candidateVisibleNote"
                                    control={control}
                                    render={({ field }) => (
                                        <Input.TextArea
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            rows={2}
                                            placeholder="Mức lương đã bao gồm BHXH. Làm việc T2–T6, 8:30–17:30."
                                        />
                                    )}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Ghi chú nội bộ"
                                extra="Chỉ HR và Company Admin đọc được. Không gửi cho ứng viên, không hiển thị với quản lý phòng ban."
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
                        </Form>
                    </Card>
                )}
            </div>
        </div>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 500 }}>{value || "—"}</div>
        </div>
    );
}
