import type { ReactNode } from "react";
import { ApartmentOutlined, ClockCircleOutlined, EnvironmentOutlined } from "@ant-design/icons";
import StatusTag from "../../../components/ui/StatusTag";
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

/** Thẻ việc làm dùng ở danh sách (C02), "Việc làm tương tự" (C03) và trang không có kết quả (C31) — theo C02:
 *  chip phòng ban (+ "Tuyển gấp") · tên việc làm · địa điểm / hình thức / loại hình kèm icon | lương xanh + ngày đăng. */
export function JobCard({ job, compact = false }: { job: PublicJobPosting; compact?: boolean }) {
    const navigate = useNavigate();
    type Meta = { icon: ReactNode; text: string };
    const arrangement = arrangementLabel(job);
    const meta: Meta[] = [];
    if (job.workLocationName) meta.push({ icon: <EnvironmentOutlined />, text: job.workLocationName });
    if (arrangement) meta.push({ icon: <ApartmentOutlined />, text: arrangement });
    if (job.employmentTypeName) meta.push({ icon: <ClockCircleOutlined />, text: job.employmentTypeName });
    return (
        <div
            className="row-clickable"
            onClick={() => navigate(`/careers/jobs/${job.id}`)}
            style={{
                display: "flex", alignItems: "center", gap: 16, padding: compact ? 16 : "18px 22px", borderRadius: 20,
                background: COLORS.cardBg, cursor: "pointer", boxShadow: compact ? `inset 0 0 0 1px ${COLORS.border}` : undefined,
            }}
        >
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {(job.departmentName || job.urgent) && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {job.departmentName && <StatusTag label={job.departmentName} tone="brand" />}
                        {job.urgent && <StatusTag label="Tuyển gấp" tone="danger" />}
                    </span>
                )}
                <span style={{ fontSize: compact ? 15 : 17, fontWeight: 700, color: COLORS.textPrimary }}>{job.title}</span>
                <span style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: COLORS.textSecondary }}>
                    {meta.map((m) => (
                        <span key={m.text} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{m.icon}{m.text}</span>
                    ))}
                </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <b style={{ fontSize: 16, color: COLORS.primary, whiteSpace: "nowrap" }}>{salaryText(job.salaryMin, job.salaryMax)}</b>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{relativeTime(job.publishedAt)}</span>
            </div>
        </div>
    );
}
