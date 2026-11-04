import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { PublicJobPosting } from "../types";
import { arrangementLabel, salaryText } from "../jobFormat";
import { COLORS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";

export function Chip({ children }: { children: ReactNode }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 10px", borderRadius: 12, background: COLORS.fill, fontSize: 12, color: COLORS.textSecondary }}>
            {children}
        </span>
    );
}

/** Thẻ việc làm dùng ở danh sách (C02), "Việc làm tương tự" (C03) và trang không có kết quả (C31). */
export function JobCard({ job, compact = false }: { job: PublicJobPosting; compact?: boolean }) {
    const navigate = useNavigate();
    const chips = [job.workLocationName, arrangementLabel(job), job.employmentTypeName].filter(Boolean) as string[];
    return (
        <div
            className="row-clickable"
            onClick={() => navigate(`/careers/jobs/${job.id}`)}
            style={{
                display: "flex", flexDirection: "column", gap: 8, padding: compact ? 16 : 20, borderRadius: 20,
                background: COLORS.cardBg, cursor: "pointer", boxShadow: compact ? `inset 0 0 0 1px ${COLORS.border}` : undefined,
            }}
        >
            {(job.departmentName || job.urgent) && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {job.departmentName && <span style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600 }}>{job.departmentName}</span>}
                    {job.urgent && <span style={{ height: 20, padding: "0 8px", borderRadius: 10, background: "#FFE9DB", color: "#D45500", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>Tuyển gấp</span>}
                </span>
            )}
            <span style={{ fontSize: compact ? 15 : 17, fontWeight: 700, color: COLORS.textPrimary }}>{job.title}</span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chips.map((c) => <Chip key={c}>{c}</Chip>)}</span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <b style={{ fontSize: 14 }}>{salaryText(job.salaryMin, job.salaryMax)}</b>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{relativeTime(job.publishedAt)}</span>
            </span>
        </div>
    );
}
