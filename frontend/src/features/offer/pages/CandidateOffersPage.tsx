import { Button, Spin } from "antd";
import { MailOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import type { CandidateOfferResponse } from "../types";
import { COLORS, type StatusTone } from "../../../app/theme";
import { formatMoney } from "../../../app/money";
import { InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import EmptyState from "../../../components/ui/EmptyState";
import { awaitingReply, useCandidatePortal } from "../../candidate/useCandidatePortal";

/**
 * C15 · Thư mời nhận việc (ứng viên): thư đang chờ phản hồi là thẻ lớn ở trên (hạn, ngày bắt đầu, lương đề xuất),
 * các thư đã phản hồi / hết hạn là thẻ gọn bên dưới (chữ mờ, icon xám) — như HTML.
 */
const CLOSED_VIEW: Record<string, { label: string; tone: StatusTone }> = {
    ACCEPTED: { label: "Đã nhận việc", tone: "success" },
    DECLINED: { label: "Đã từ chối", tone: "neutral" },
    EXPIRED: { label: "Đã hết hạn", tone: "warning" },
    APPROVED: { label: "Đã hết hạn", tone: "warning" },
};
const PAY_SUFFIX: Record<string, string> = { MONTHLY: "/tháng", YEARLY: "/năm" };

export default function CandidateOffersPage() {
    const navigate = useNavigate();
    const { loading, failed, offers, applications, reload } = useCandidatePortal();

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;

    const visible = offers.filter((o) => ["APPROVED", "ACCEPTED", "DECLINED", "EXPIRED"].includes(o.status));
    const pending = visible.filter(awaitingReply)
        .sort((a, b) => dayjs(a.responseDeadline ?? "2999-01-01").valueOf() - dayjs(b.responseDeadline ?? "2999-01-01").valueOf());
    const others = visible.filter((o) => !awaitingReply(o)).sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
    const deptOf = (o: CandidateOfferResponse) => applications.find((a) => a.id === o.applicationId)?.departmentName;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle title="Thư mời nhận việc" />
            {failed && (
                <InlineNotice tone="danger" action={<Button onClick={reload}>Thử lại</Button>}>
                    Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.
                </InlineNotice>
            )}
            {!failed && visible.length === 0 && (
                <Panel><EmptyState title="Bạn chưa nhận được thư mời nhận việc nào" /></Panel>
            )}

            {pending.map((o) => (
                <Panel key={o.id} style={{ boxShadow: `inset 0 0 0 1.5px ${COLORS.success}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <MailTile tone="success" />
                        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <StatusTag label="Chờ bạn phản hồi" tone="warning" />
                                {o.responseDeadline && (
                                    <span style={{ fontSize: 12, color: COLORS.warning, fontWeight: 600 }}>
                                        Hạn {dayjs(o.responseDeadline).format("DD/MM")}
                                    </span>
                                )}
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 700 }}>{o.jobTitle ?? "Thư mời nhận việc"}</span>
                            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Bắt đầu {dayjs(o.startDate).format("DD/MM/YYYY")}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Lương đề xuất</span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>
                                {formatMoney(o.salaryOffered)}{PAY_SUFFIX[o.payFrequency ?? "MONTHLY"] ?? ""}
                            </span>
                        </div>
                        <Button type="primary" onClick={() => navigate(`/my-offers/${o.id}`)}>Xem thư mời</Button>
                    </div>
                </Panel>
            ))}

            {others.map((o) => (
                <Panel key={o.id}>
                    <div className="row-clickable" onClick={() => navigate(`/my-offers/${o.id}`)}
                        style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                        <MailTile tone="neutral" />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, minWidth: 0 }}>
                            <StatusTag {...(CLOSED_VIEW[o.status] ?? CLOSED_VIEW.EXPIRED)} />
                            <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.textSecondary }}>{o.jobTitle ?? "Thư mời nhận việc"}</span>
                            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                                {[deptOf(o), dayjs(o.createdAt).format("DD/MM/YYYY")].filter(Boolean).join(" · ")}
                            </span>
                        </div>
                        <Button>Chi tiết</Button>
                    </div>
                </Panel>
            ))}
        </div>
    );
}

function MailTile({ tone }: { tone: "success" | "neutral" }) {
    return (
        <span style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 20,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: tone === "success" ? COLORS.successBg : COLORS.fill,
            color: tone === "success" ? COLORS.success : COLORS.textSecondary,
        }}>
            <MailOutlined />
        </span>
    );
}
