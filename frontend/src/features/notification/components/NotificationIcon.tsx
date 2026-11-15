import { BellOutlined, CalendarOutlined, CheckCircleOutlined, FileTextOutlined, MailOutlined, SolutionOutlined } from "@ant-design/icons";
import { COLORS } from "../../../app/theme";
import type { NotificationResponse } from "../types";

/** Ô icon theo loại đối tượng (C19, C27): lịch cam, thư mời xanh lá, hồ sơ / yêu cầu xanh chính, còn lại xám. */
export function NotificationIcon({ n, size = 40 }: { n: NotificationResponse; size?: number }) {
    const t = (n.resourceType ?? n.type ?? "").toUpperCase();
    const v = t.includes("INTERVIEW") ? { icon: <CalendarOutlined />, bg: COLORS.warningBg, color: COLORS.warning }
        : t.includes("OFFER") ? { icon: <MailOutlined />, bg: COLORS.successBg, color: COLORS.success }
            : t.includes("APPLICATION") ? { icon: <CheckCircleOutlined />, bg: COLORS.primarySoft, color: COLORS.primary }
                : t.includes("REQUISITION") ? { icon: <SolutionOutlined />, bg: COLORS.primarySoft, color: COLORS.primary }
                    : t.includes("DOCUMENT") || t.includes("CV") ? { icon: <FileTextOutlined />, bg: COLORS.fill, color: COLORS.textSecondary }
                        : { icon: <BellOutlined />, bg: COLORS.fill, color: COLORS.textSecondary };
    return (
        <span style={{
            width: size, height: size, borderRadius: size * 0.3, flexShrink: 0, fontSize: size * 0.42,
            display: "inline-flex", alignItems: "center", justifyContent: "center", background: v.bg, color: v.color,
        }}>{v.icon}</span>
    );
}
