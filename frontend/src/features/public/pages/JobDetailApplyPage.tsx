import { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { getPublicJobById, getPublicJobs } from "../publicApi";
import type { PublicJobPosting } from "../types";
import { arrangementLabel, salaryText } from "../jobFormat";
import { Chip, JobCard } from "../components/JobCard";
import { getMyApplications } from "../../candidate/applicationApi";
import type { CandidateApplicationResponse } from "../../candidate/types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import { InlineNotice } from "../../../components/ui/designKit";

/**
 * C03 · Chi tiết việc làm (công khai) · C29 đã ứng tuyển ("Bạn đã ứng tuyển … Xem đơn ứng tuyển") ·
 * C30 tin đã đóng / không tồn tại kèm "Việc làm tương tự".
 * "Ứng tuyển ngay": chưa đăng nhập → trang đăng nhập rồi quay lại (C04); ứng viên → biểu mẫu C09.
 * Khác HTML: chưa có "Hạn nộp", "Cấp bậc", nhãn "Tuyển gấp"; các bước tuyển dụng là các bước chung.
 */
const STEPS = [
    { title: "Sàng lọc hồ sơ", hint: "Bộ phận tuyển dụng xem hồ sơ của bạn" },
    { title: "Phỏng vấn", hint: "Bạn tự chọn giờ trong các khung được đề xuất" },
    { title: "Nhận thư mời nhận việc", hint: "Phản hồi ngay trên cổng ứng viên" },
];

/** Tách nội dung nhiều dòng thành gạch đầu dòng (bỏ ký hiệu "-", "•" người viết tự gõ). */
function lines(text: string | null) {
    return (text ?? "").split(/\r?\n/).map((l) => l.replace(/^\s*[-•*+]\s*/, "").trim()).filter(Boolean);
}

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
    // "Kinh nghiệm" là chữ tự do: ngắn ("2+ năm") thì làm chip, dài thì hiện thành mục riêng trong nội dung.
    const expShort = job.experienceRequired && job.experienceRequired.length <= 30 ? job.experienceRequired : null;
    const expLong = job.experienceRequired && !expShort ? job.experienceRequired : null;
    const chips = [arrangementLabel(job), job.employmentTypeName, expShort ? `${expShort} kinh nghiệm` : null,
        job.headcount ? `Tuyển ${job.headcount} người` : null].filter(Boolean) as string[];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                <a onClick={() => navigate("/careers")}>Việc làm</a>{job.departmentName ? ` / ${job.departmentName}` : ""}
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            {job.departmentName && <b style={{ color: COLORS.primary }}>{job.departmentName} · </b>}Đăng {relativeTime(job.publishedAt).toLowerCase()}
                        </span>
                        <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25 }}>{job.title}</span>
                        {job.workLocationName && <span style={{ color: COLORS.textSecondary }}>{job.workLocationName}</span>}
                        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chips.map((c) => <Chip key={c}>{c}</Chip>)}</span>
                    </section>

                    {mine && (
                        <InlineNotice tone="success" action={<Button onClick={() => navigate(`/my-applications/${mine.id}`)}>Xem đơn ứng tuyển</Button>}>
                            Bạn đã ứng tuyển vị trí này ngày {dayjs(mine.appliedAt).format("DD/MM/YYYY")}.
                        </InlineNotice>
                    )}

                    <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
                        <Section title="Mô tả công việc" text={job.description} />
                        <Section title="Kinh nghiệm" text={expLong} />
                        <Section title="Yêu cầu" text={job.requirements} />
                        <Section title="Quyền lợi" text={job.benefits} />
                    </section>
                </div>

                <aside style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 16 }}>
                    <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                        <Info label="Mức lương" value={salaryText(job.salaryMin, job.salaryMax)} strong />
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
                    <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                        <b>Các bước tuyển dụng</b>
                        {STEPS.map((s, i) => (
                            <div key={s.title} style={{ display: "flex", gap: 10 }}>
                                <span style={{
                                    width: 24, height: 24, borderRadius: 12, flexShrink: 0, background: COLORS.primarySoft, color: COLORS.primary,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                                }}>{i + 1}</span>
                                <span style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</span>
                                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{s.hint}</span>
                                </span>
                            </div>
                        ))}
                    </section>
                </aside>
            </div>

            {similar.length > 0 && <SimilarJobs jobs={similar} />}
        </div>
    );
}

function Section({ title, text }: { title: string; text: string | null }) {
    const items = lines(text);
    if (items.length === 0) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ fontSize: 17 }}>{title}</b>
            {items.length === 1
                ? <span style={{ lineHeight: 1.7 }}>{items[0]}</span>
                : <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>{items.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </div>
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
