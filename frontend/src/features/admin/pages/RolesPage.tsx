import { CheckOutlined } from "@ant-design/icons";
import { COLORS, RADIUS } from "../../../app/theme";
import { ScreenTitle } from "../../../components/ui/designKit";
import { PERMISSION_MATRIX, type PermissionCell } from "../adminLabels";

/** A07 · Vai trò & quyền (cố định) — bảng chỉ đọc. */
export default function RolesPage() {
    const cell = (v: PermissionCell) =>
        v === true ? <CheckOutlined style={{ color: COLORS.primary }} />
            : v === false ? <span style={{ color: COLORS.textMuted }}>—</span>
                : <span style={{ fontSize: 13 }}>{v}</span>;

    const grid = { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "12px 20px" } as const;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle
                title="Vai trò & quyền"
                subtitle="4 vai trò cố định · ứng viên chỉ dùng trang tuyển dụng và cổng ứng viên"
            />
            <section style={{ background: COLORS.cardBg, borderRadius: RADIUS.lg, overflow: "hidden" }}>
                <div style={{ ...grid, fontSize: 12, color: COLORS.textSecondary }}>
                    <span>Quyền</span>
                    <span>Chuyên viên tuyển dụng</span>
                    <span>Đại diện phòng ban</span>
                    <span>Quản trị doanh nghiệp</span>
                </div>
                {PERMISSION_MATRIX.map((row) => (
                    <div key={row.name} style={{ ...grid, borderTop: `0.5px solid ${COLORS.border}` }}>
                        <span style={{ fontWeight: 500 }}>{row.name}</span>
                        <span>{cell(row.recruiter)}</span>
                        <span>{cell(row.hm)}</span>
                        <span>{cell(row.admin)}</span>
                    </div>
                ))}
            </section>
        </div>
    );
}
