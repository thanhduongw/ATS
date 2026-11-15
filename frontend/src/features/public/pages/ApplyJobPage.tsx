import { useEffect, useState } from "react";
import { App, Button, Checkbox, Form, Input, Spin, Upload } from "antd";
import StatusTag from "../../../components/ui/StatusTag";
import {
    CalendarOutlined, CheckCircleOutlined, CheckOutlined, FilePdfOutlined, FileTextOutlined, SearchOutlined,
    ShoppingOutlined, UploadOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getPublicCompany, getPublicJobById } from "../publicApi";
import type { PublicJobPosting } from "../types";
import { arrangementLabel, salaryText } from "../jobFormat";
import { Chip } from "../components/JobCard";
import { getMyCandidateProfile, updateMyCandidateProfile, uploadMyCandidateResume } from "../../candidate/candidateApi";
import { applyToJob, getMyApplications } from "../../candidate/applicationApi";
import type { ApiMessageResponse, CandidateSelfResponse } from "../../candidate/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { useAppSelector } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { InlineNotice } from "../../../components/ui/designKit";

/**
 * C09 · Biểu mẫu ứng tuyển (ứng viên đã đăng nhập): dùng CV trong hồ sơ, "Tải CV khác (PDF, DOCX ≤ 5 MB)",
 * thông tin liên hệ, ô đồng ý xử lý dữ liệu → C10 · Ứng tuyển thành công với 3 bước "Tiếp theo" (bước phỏng vấn theo
 * lịch 1 giờ cố định: đồng ý hoặc xin dời, không chọn khung giờ).
 * Nguồn ứng tuyển: tự gán "trang tuyển dụng / website" trong danh mục (HTML không hỏi ứng viên).
 * Khác HTML: chưa giữ dữ liệu đang nhập khi phiên đăng nhập hết hạn (C34).
 */
const MAX_CV_MB = 5;
type ContactForm = { fullName: string; phone: string; currentPosition?: string };

const fileNameOf = (url: string | null) => (url ? decodeURIComponent(url.split("?")[0].split("/").pop() ?? "") : "");

export default function ApplyJobPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const id = Number(jobId);
    const navigate = useNavigate();
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role);
    const [form] = Form.useForm<ContactForm>();
    const [job, setJob] = useState<PublicJobPosting | null>(null);
    const [profile, setProfile] = useState<CandidateSelfResponse | null>(null);
    const [company, setCompany] = useState("");
    const [sourceId, setSourceId] = useState<number | null>(null);
    const [alreadyAppId, setAlreadyAppId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [agree, setAgree] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [doneAt, setDoneAt] = useState<string | null>(null);

    useEffect(() => {
        if (role !== "CANDIDATE") return;
        Promise.all([
            getPublicJobById(id).then((r) => r.data).catch(() => null),
            getMyCandidateProfile().then((r) => r.data),
            getPublicCompany().then((r) => r.data.name).catch(() => ""),
            getCatalogItems("/masterdata/recruitment-sources").then((r) => r.data).catch(() => []),
            getMyApplications().then((r) => r.data).catch(() => []),
        ]).then(([j, p, c, sources, apps]) => {
            setJob(j);
            setProfile(p);
            setCompany(c);
            const active = sources.filter((s) => s.active);
            const site = active.find((s) => /website|trang tuyển dụng|career/i.test(String(s.name)));
            setSourceId((site ?? active[0])?.id ?? null);
            setAlreadyAppId(apps.find((a) => a.jobPostingId === id)?.id ?? null);
            form.setFieldsValue({ fullName: p.fullName, phone: p.phone ?? "", currentPosition: p.currentPosition ?? "" });
        }).catch(() => message.error("Không tải được hồ sơ của bạn"))
            .finally(() => setLoading(false));
    }, [id, role, form, message]);

    if (!role) return <Navigate to={`/login?redirect=${encodeURIComponent(`/careers/jobs/${id}/apply`)}`} replace />;
    if (role !== "CANDIDATE") return <InlineNotice tone="warning">Chỉ tài khoản ứng viên mới ứng tuyển được.</InlineNotice>;
    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    if (!job || job.status !== "OPEN") {
        return <InlineNotice tone="warning" action={<Button onClick={() => navigate("/careers")}>Xem việc làm khác</Button>}>
            Tin tuyển dụng đã đóng hoặc không tồn tại.
        </InlineNotice>;
    }
    if (alreadyAppId && !doneAt) {
        return <InlineNotice tone="success" action={<Button onClick={() => navigate(`/my-applications/${alreadyAppId}`)}>Xem đơn ứng tuyển</Button>}>
            Bạn đã ứng tuyển vị trí <b>{job.title}</b>.
        </InlineNotice>;
    }

    // C10 · Ứng tuyển thành công: vòng ✓ lớn, tiêu đề, thẻ "Tiếp theo" 3 bước có icon, hai nút căn giữa.
    if (doneAt) {
        const steps = [
            { t: "Đã nhận hồ sơ", h: `Hôm nay, ${dayjs(doneAt).format("HH:mm")}`, icon: <CheckCircleOutlined />, bg: COLORS.successBg, color: COLORS.success },
            { t: "Sàng lọc hồ sơ", h: "Bộ phận tuyển dụng sẽ xem hồ sơ của bạn", icon: <SearchOutlined />, bg: COLORS.primarySoft, color: COLORS.primary },
            // Lịch 1 giờ cố định (04/11/2026): ứng viên chỉ đồng ý hoặc từ chối lịch được gửi.
            { t: "Mời phỏng vấn", h: "Bạn nhận lịch phỏng vấn và chỉ cần đồng ý hoặc xin dời", icon: <CalendarOutlined />, bg: COLORS.fill, color: COLORS.textSecondary },
        ];
        return (
            <div style={{ maxWidth: 600, margin: "24px auto 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
                <span style={{
                    width: 80, height: 80, borderRadius: 40, background: COLORS.successBg, color: COLORS.success,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                }}><CheckOutlined /></span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <b style={{ fontSize: 32, letterSpacing: "-0.01em" }}>Đã gửi hồ sơ thành công!</b>
                    <span style={{ color: COLORS.textSecondary, fontSize: 15 }}>{job.title}</span>
                </div>
                <section style={{ width: "100%", background: COLORS.cardBg, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
                    <b style={{ fontSize: 16 }}>Tiếp theo</b>
                    {steps.map((st) => (
                        <div key={st.t} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{
                                width: 32, height: 32, borderRadius: 16, flexShrink: 0, background: st.bg, color: st.color,
                                display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                            }}>{st.icon}</span>
                            <span style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 600 }}>{st.t}</span>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{st.h}</span>
                            </span>
                        </div>
                    ))}
                </section>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <Button type="primary" size="large" icon={<FileTextOutlined />} onClick={() => navigate("/my-applications")}>Theo dõi đơn ứng tuyển</Button>
                    <Button size="large" onClick={() => navigate("/careers")}>Xem việc làm khác</Button>
                </div>
            </div>
        );
    }

    const submit = async (v: ContactForm) => {
        if (!profile?.resumeUploaded) { message.error("Hãy tải CV lên trước khi nộp hồ sơ"); return; }
        if (sourceId == null) { message.error("Chưa tải được danh mục nguồn ứng tuyển, vui lòng thử lại"); return; }
        setSubmitting(true);
        try {
            // Lưu thông tin liên hệ vào hồ sơ (giữ nguyên các trường khác), rồi nộp đơn.
            await updateMyCandidateProfile({
                fullName: v.fullName.trim(), phone: v.phone.trim(), currentPosition: v.currentPosition?.trim() || null,
                dateOfBirth: profile.dateOfBirth, gender: profile.gender, address: profile.address,
                educationLevelId: profile.educationLevelId, skillIds: profile.skillIds,
            });
            const r = await applyToJob({ jobPostingId: job.id, recruitmentSourceId: sourceId });
            setDoneAt(r.data.appliedAt ?? new Date().toISOString());
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không nộp được hồ sơ, vui lòng thử lại");
        } finally { setSubmitting(false); }
    };

    const grid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 16 } as const;
    const chips = [job.workLocationName, arrangementLabel(job)].filter(Boolean) as string[];

    return (
        <Form form={form} layout="vertical" requiredMark onFinish={submit}
            style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* C09: một hàng — ô icon · "Đang ứng tuyển" + tên việc làm · chip địa điểm / hình thức / lương. */}
            <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: COLORS.primarySoft, color: COLORS.primary,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}><ShoppingOutlined /></span>
                <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Đang ứng tuyển</span>
                    <b style={{ fontSize: 17 }}>{job.title}</b>
                </span>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {chips.map((c) => <Chip key={c}>{c}</Chip>)}
                    <StatusTag label={salaryText(job.salaryMin, job.salaryMax)} tone="brand" />
                </span>
            </section>

            <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <b style={{ fontSize: 17 }}>CV</b>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, boxShadow: `inset 0 0 0 1px ${COLORS.border}` }}>
                    <FilePdfOutlined style={{ fontSize: 26, color: profile?.resumeUploaded ? COLORS.error : COLORS.textMuted }} />
                    <span style={{ flex: 1, fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {profile?.resumeUploaded ? (fileNameOf(profile.resumeUrl) || "CV trong hồ sơ của bạn") : "Bạn chưa có CV"}
                    </span>
                </div>
                <Upload accept=".pdf,.doc,.docx" maxCount={1} showUploadList={false} beforeUpload={async (file) => {
                    if (file.size > MAX_CV_MB * 1024 * 1024) { message.error(`CV tối đa ${MAX_CV_MB} MB`); return Upload.LIST_IGNORE; }
                    setUploading(true);
                    try {
                        const r = await uploadMyCandidateResume(file);
                        setProfile(r.data);
                        message.success("Đã tải CV lên");
                    } catch (err) {
                        const e = err as AxiosError<ApiMessageResponse>;
                        message.error(e.response?.data?.message ?? "Không tải được CV");
                    } finally { setUploading(false); }
                    return Upload.LIST_IGNORE;
                }}>
                    <Button icon={<UploadOutlined />} loading={uploading}>
                        {profile?.resumeUploaded ? `Tải CV khác (PDF, DOCX ≤ ${MAX_CV_MB} MB)` : `Tải CV (PDF, DOCX ≤ ${MAX_CV_MB} MB)`}
                    </Button>
                </Upload>
            </section>

            <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: 20 }}>
                <b style={{ display: "block", marginBottom: 12, fontSize: 17 }}>Thông tin liên hệ</b>
                <div style={grid}>
                    <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, whitespace: true, message: "Nhập họ và tên" }]}>
                        <Input maxLength={150} />
                    </Form.Item>
                    <Form.Item label="Email"><Input value={profile?.email} disabled /></Form.Item>
                    <Form.Item name="phone" label="Số điện thoại"
                        rules={[{ required: true, message: "Nhập số điện thoại" }, { pattern: /^[0-9+ .()-]{8,20}$/, message: "Số điện thoại không hợp lệ" }]}>
                        <Input maxLength={20} />
                    </Form.Item>
                    <Form.Item name="currentPosition" label="Vị trí hiện tại" required={false}><Input maxLength={200} /></Form.Item>
                </div>
                <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)}>
                    Tôi đồng ý cho {company || "doanh nghiệp"} xử lý dữ liệu cho đợt tuyển dụng này
                </Checkbox>
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button onClick={() => navigate(`/careers/jobs/${job.id}`)}>Huỷ</Button>
                <Button type="primary" htmlType="submit" disabled={!agree || !profile?.resumeUploaded} loading={submitting}>Nộp hồ sơ</Button>
            </div>
        </Form>
    );
}
