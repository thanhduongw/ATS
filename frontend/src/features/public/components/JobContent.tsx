import dayjs from "dayjs";
import type { PublicJobPosting } from "../types";
import { arrangementLabel, experienceParts } from "../jobFormat";
import { Chip } from "./JobCard";
import { COLORS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";

function lines(text: string | null | undefined) {
    return (text ?? "").split(/\r?\n/).map((l) => l.replace(/^\s*[-•*+]\s*/, "").trim()).filter(Boolean);
}

function Section({ title, text }: { title: string; text: string | null | undefined }) {
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

export function UrgentTag() {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 10, background: "#FFE9DB", color: "#D45500", fontSize: 11, fontWeight: 700 }}>
            Tuyển gấp
        </span>
    );
}

/** Phần nội dung tin (C03), dùng chung cho trang chi tiết công khai và bản xem trước R08. */
export default function JobContent({ job, compact = false }: { job: PublicJobPosting; compact?: boolean }) {
    const exp = experienceParts(job);
    const chips = [arrangementLabel(job), job.employmentTypeName, exp.short ? `${exp.short} kinh nghiệm` : null,
        job.headcount ? `Tuyển ${job.headcount} người` : null].filter(Boolean) as string[];
    const pad = compact ? 16 : 24;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: pad, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 12, color: COLORS.textSecondary, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {job.departmentName && <b style={{ color: COLORS.primary }}>{job.departmentName}</b>}
                    {job.urgent && <UrgentTag />}
                    <span>Đăng {job.publishedAt ? relativeTime(job.publishedAt).toLowerCase() : "hôm nay"}</span>
                </span>
                <span style={{ fontSize: compact ? 22 : 28, fontWeight: 700, lineHeight: 1.25 }}>{job.title || "Tiêu đề tin"}</span>
                {job.workLocationName && <span style={{ color: COLORS.textSecondary }}>{job.workLocationName}</span>}
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chips.map((c) => <Chip key={c}>{c}</Chip>)}</span>
                {job.applicationDeadline && (
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Hạn nộp hồ sơ: <b style={{ color: COLORS.textPrimary }}>{dayjs(job.applicationDeadline).format("DD/MM/YYYY")}</b></span>
                )}
            </section>
            <section style={{ background: COLORS.cardBg, borderRadius: 20, padding: pad, display: "flex", flexDirection: "column", gap: 22 }}>
                <Section title="Mô tả công việc" text={job.description} />
                <Section title="Kinh nghiệm" text={exp.long} />
                <Section title="Yêu cầu" text={job.requirements} />
                <Section title="Quyền lợi" text={job.benefits} />
            </section>
        </div>
    );
}
