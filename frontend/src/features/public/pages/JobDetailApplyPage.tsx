import { useEffect, useState, type ReactNode } from "react";
import { Button, Spin } from "antd";
import { ApartmentOutlined, ClockCircleOutlined, EnvironmentOutlined, LeftOutlined, ShoppingOutlined, TeamOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { getPublicJobById, getPublicJobs } from "../publicApi";
import type { PublicJobPosting } from "../types";
import { arrangementLabel, experienceParts, salaryText } from "../jobFormat";
import JobContent from "../components/JobContent";
import { JobCard } from "../components/JobCard";
import { getMyApplications } from "../../candidate/applicationApi";
import type { CandidateApplicationResponse } from "../../candidate/types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, GRADIENTS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import { InlineNotice } from "../../../components/ui/designKit";

/**
 * C03 · Chi tiết việc làm (công khai) · C29 đã ứng tuyển ("Bạn đã ứng tuyển … Xem đơn ứng tuyển") ·
 * C30 tin đã đóng / không tồn tại kèm "Việc làm tương tự".
 * "Ứng tuyển ngay": chưa đăng nhập → trang đăng nhập rồi quay lại (C04); ứng viên → biểu mẫu C09.
 * Bỏ ô "Các bước tuyển dụng" của HTML (quyết định 13/11/2026).
 */

export default function JobDetailApplyPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const role = useAppSelector((s) => s.auth.user?.role);
    const [job, setJob] = useState<PublicJobPosting | null>(null);
    const [others, setOthers] = useState<PublicJobPosting[]>([]);
    const [mine, setMine] = useState<CandidateApplicationResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = Number(jobId);
        Promise.all([
            Number.isInteger(id) ? getPublicJobById(id).then((r) => r.data).catch(() => null) : Promise.resolve(null),
            getPublicJobs().then((r) => r.data).catch(() => [] as PublicJobPosting[]),
            role === "CANDIDATE" ? getMyApplications().then((r) => r.data).catch(() => []) : Promise.resolve([]),
        ]).then(([j, all, apps]) => {
            setJob(j);
            setOthers(all.filter((x) => x.id !== id));
            setMine(apps.find((a) => a.jobPostingId === id) ?? null);
        }).finally(() => setLoading(false));
    }, [jobId, role]);

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;

    const similar = [...others]
        .sort((a, b) => Number(b.departmentId === job?.departmentId) - Number(a.departmentId === job?.departmentId)
            || dayjs(b.publishedAt ?? 0).valueOf() - dayjs(a.publishedAt ?? 0).valueOf())
        .slice(0, 3);

    // C30 · Tin đã đóng / không tồn tại.
    if (!job || job.status !== "OPEN") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ background: COLORS.cardBg, borderRadius: 20, padding: 40, textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                    <b style={{ fontSize: 20 }}>{job ? "Tin tuyển dụng đã đóng" : "Không tìm thấy tin tuyển dụng"}</b>
                    <span style={{ color: COLORS.textSecondary }}>{job ? "Vị trí này không còn nhận hồ sơ." : "Tin có thể đã bị gỡ hoặc đường dẫn không đúng."}</span>
                    <Button type="primary" onClick={() => navigate("/careers")}>Xem việc làm khác</Button>
                </div>
                {similar.length > 0 && <SimilarJobs jobs={similar} />}
            </div>
        );
    }

    const apply = () => {
        const target = `/careers/jobs/${job.id}/apply`;
        if (!role) navigate(`/login?redirect=${encodeURIComponent(target)}`, { state: { jobTitle: job.title } });
        else navigate(target);
    };
    const expShort = experienceParts(job).short;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Dải đầu C03 trên nền xanh đậm: breadcrumb · chip · tiêu đề · dòng phụ có icon. */}
            <div style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", marginTop: -28, padding: "24px 24px 36px", background: GRADIENTS.hero }}>
                <div style={{ maxWidth: 1152, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, color: COLORS.textOnDark }}>
                    <span style={{ fontSize: 13, opacity: 0.8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <LeftOutlined style={{ fontSize: 10 }} />
                        <a onClick={() => navigate("/careers")} style={{ color: "inherit" }}>Việc làm</a>
                        {job.departmentName && <> / {job.departmentName}</>}
                    </span>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {job.departmentName && <HeroChip>{job.departmentName}</HeroChip>}
                        {job.urgent && <HeroChip urgent>Tuyển gấp</HeroChip>}
                        <HeroChip>Đăng {job.publishedAt ? relativeTime(job.publishedAt).toLowerCase() : "hôm nay"}</HeroChip>
                    </span>
                    <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{job.title}</span>
                    <span style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14, opacity: 0.9 }}>
                        {job.workLocationName && <span><EnvironmentOutlined /> {job.workLocationName}</span>}
                        {arrangementLabel(job) && <span><ApartmentOutlined /> {arrangementLabel(job)}</span>}
                        {job.employmentTypeName && <span><ClockCircleOutlined /> {job.employmentTypeName}</span>}
                        {expShort && <span><ShoppingOutlined /> {expShort} kinh nghiệm</span>}
                        {job.headcount ? <span><TeamOutlined /> Tuyển {job.headcount} người</span> : null}
                    </span>
                </div>
            </div>

            <div className="cand-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 24, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {mine && (
                        <InlineNotice tone="success" action={<Button onClick={() => navigate(`/my-applications/${mine.id}`)}>Xem đơn ứng tuyển</Button>}>
                            Bạn đã ứng tuyển vị trí này ngày {dayjs(mine.appliedAt).format("DD/MM/YYYY")}.
                        </InlineNotice>
                    )}

                    <JobContent job={job} header={false} />
                </div>

                <aside style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 16 }}>
                    <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Mức lương</span>
                        <span style={{ fontSize: 26, fontWeight: 700, color: COLORS.primary, marginTop: -6 }}>{salaryText(job.salaryMin, job.salaryMax)}</span>
                        {job.applicationDeadline && <Info label="Hạn nộp" value={dayjs(job.applicationDeadline).format("DD/MM/YYYY")} />}
                        {job.employmentTypeName && <Info label="Loại hình" value={job.employmentTypeName} />}
                        {expShort && <Info label="Kinh nghiệm" value={expShort} />}
                        {mine ? (
                            <Button size="large" block onClick={() => navigate(`/my-applications/${mine.id}`)}>Xem đơn ứng tuyển</Button>
                        ) : role && role !== "CANDIDATE" ? (
                            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Đăng nhập bằng tài khoản ứng viên để ứng tuyển.</span>
                        ) : (
                            <Button size="large" type="primary" block onClick={apply}>Ứng tuyển ngay</Button>
                        )}
                    </section>
                </aside>
            </div>

            {similar.length > 0 && <SimilarJobs jobs={similar} />}
        </div>
    );
}

function HeroChip({ children, urgent = false }: { children: ReactNode; urgent?: boolean }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", height: 24, padding: "0 10px", borderRadius: 12, fontSize: 12, fontWeight: 500,
            // Chip trên dải xanh đậm: trắng mờ 14% (chỉ dùng ở đây); "Tuyển gấp" nền trắng chữ đỏ cho đủ tương phản.
            background: urgent ? COLORS.cardBg : "rgba(255,255,255,0.14)", color: urgent ? COLORS.error : COLORS.textOnDark,
        }}>{children}</span>
    );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>{label}</span>
            <span style={{ fontWeight: strong ? 700 : 500, fontSize: strong ? 16 : 14 }}>{value}</span>
        </div>
    );
}

function SimilarJobs({ jobs }: { jobs: PublicJobPosting[] }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <b style={{ fontSize: 17 }}>Việc làm tương tự</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                {jobs.map((j) => <JobCard key={j.id} job={j} compact />)}
            </div>
        </div>
    );
}
