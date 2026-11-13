import { useCallback, useEffect, useState } from "react";
import { App, Button, Spin } from "antd";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { forgotPassword, getUsers, resendInvitation, updateUserStatus } from "../../auth/authApi";
import type { ApiMessageResponse, UserSummaryResponse } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { getApplications } from "../../candidate/applicationApi";
import { getRequisitions } from "../../recruitment/recruitmentApi";
import { getInterviews } from "../../interview/interviewApi";
import { INTERVIEW_HELD } from "../../interview/types";
import { getOffers } from "../../offer/offerApi";
import { searchAuditLogs } from "../../auditlog/auditLogApi";
import type { AuditLogResponse } from "../../auditlog/types";
import { AUDIT_ACTION_LABEL } from "../../../app/statusLabels";
import { toFixedStage } from "../../../app/stages";
import { COLORS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import { Avatar, InlineNotice, Panel, ScreenTitle, SmallDialog } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import type { ReactNode } from "react";
import { CalendarOutlined, EditOutlined, MailOutlined, SolutionOutlined, TeamOutlined } from "@ant-design/icons";
import { ROLE_NAME, USER_STATUS_VIEW } from "../adminLabels";

/**
 * A05 · Chi tiết người dùng: vai trò & phòng ban · việc đang phụ trách (chỉ số đếm) · lịch sử tài khoản (nhật ký hệ thống).
 * Khoá tài khoản kèm chuyển giao việc (A06) làm ở Đợt 3 theo quyết định C3 = bản rút gọn; lúc này khoá trực tiếp,
 * hộp xác nhận nhắc số việc còn dở.
 * Khác HTML: chưa đổi được vai trò / phòng ban (backend chưa có API), chưa có chức danh, số điện thoại, ngày tham gia.
 */
interface Duty { label: string; count: number; icon: ReactNode }

/** "Việc đang phụ trách" — chỉ đếm số, không hiện tên ứng viên. API nào lỗi thì bỏ dòng đó. */
async function loadDuties(userId: number): Promise<Duty[]> {
    const [apps, reqs, ivs, offers] = await Promise.all([
        getApplications({ size: 5000 }).catch(() => null),
        getRequisitions({ size: 1000 }).catch(() => null),
        getInterviews().catch(() => null),
        getOffers({ size: 2000 }).catch(() => null),
    ]);
    const now = dayjs();
    const mine = (ivs?.data ?? []).filter((iv) =>
        iv.status !== "CANCELLED" && iv.status !== "CANDIDATE_DECLINED" && iv.interviewers.some((p) => p.interviewerId === userId));
    const list: (Duty | null)[] = [
        apps && {
            label: "Ứng viên đang phụ trách", icon: <TeamOutlined />,
            count: apps.data.content.filter((a) =>
                a.assignedRecruiterId === userId && !["HIRED", "REJECTED"].includes(toFixedStage(a.currentStageType))).length,
        },
        reqs && {
            label: "Yêu cầu tuyển dụng chưa duyệt xong", icon: <SolutionOutlined />,
            count: reqs.data.content.filter((r) =>
                r.requesterId === userId && ["DRAFT", "PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(r.status)).length,
        },
        ivs && {
            label: "Buổi phỏng vấn sắp tới (là người phỏng vấn)", icon: <CalendarOutlined />,
            count: mine.filter((iv) => dayjs(iv.scheduledAt).isAfter(now)).length,
        },
        ivs && {
            label: "Đánh giá chưa nộp", icon: <EditOutlined />,
            count: mine.filter((iv) => INTERVIEW_HELD.has(iv.status)
                && iv.interviewers.some((p) => p.interviewerId === userId && !p.evaluationSubmitted)).length,
        },
        offers && {
            label: "Thư mời nháp / đã gửi chờ phản hồi", icon: <MailOutlined />,
            count: offers.data.content.filter((o) =>
                o.requesterId === userId && ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(o.status)).length,
        },
    ];
    return list.filter((d): d is Duty => d != null);
}

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [user, setUser] = useState<UserSummaryResponse | null>(null);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [confirmLock, setConfirmLock] = useState(false);
    const [duties, setDuties] = useState<Duty[] | null>(null);
    const [history, setHistory] = useState<AuditLogResponse[] | null>(null);

    const load = useCallback(async () => {
        try {
            const [u, d] = await Promise.all([getUsers(), getCatalogItems("/masterdata/departments")]);
            setUser(u.data.find((x) => String(x.id) === id) ?? null);
            setDepartments(d.data);
        } catch {
            message.error("Không tải được người dùng");
        } finally {
            setLoading(false);
        }
    }, [id, message]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        const uid = Number(id);
        loadDuties(uid).then(setDuties).catch(() => setDuties([]));
        searchAuditLogs({ actorUserId: uid })
            .then((r) => setHistory([...r.data]
                .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()).slice(0, 8)))
            .catch(() => setHistory([]));
    }, [id]);

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try {
            await fn();
            message.success(ok);
            setConfirmLock(false);
            await load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thao tác thất bại");
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spin /></div>;
    if (!user) {
        return (
            <InlineNotice tone="danger" action={<Button onClick={() => navigate("/admin/users")}>Về danh sách</Button>}>
                Không tìm thấy người dùng này.
            </InlineNotice>
        );
    }

    const dept = user.departmentId == null ? "—" : String(departments.find((d) => d.id === user.departmentId)?.name ?? `#${user.departmentId}`);
    const status = USER_STATUS_VIEW[user.status];
    const openDuties = (duties ?? []).reduce((n, d) => n + d.count, 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
            <div>
                <PageBreadcrumb crumb={user.fullName} />
                <ScreenTitle title="Chi tiết người dùng" />
            </div>
            <Panel>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <Avatar name={user.fullName} colorKey={user.id} size={56} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 700 }}>
                            {user.fullName} <StatusTag {...status} />
                        </span>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            {user.email} · đăng nhập gần nhất {relativeTime(user.lastLoginAt).toLowerCase()}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {user.status === "ACTIVE" && (
                            <Button loading={busy}
                                onClick={() => run(() => forgotPassword({ email: user.email }), `Đã gửi email đặt lại mật khẩu tới ${user.email}`)}>
                                Gửi email đặt lại mật khẩu
                            </Button>
                        )}
                        {user.status === "PENDING_VERIFICATION" && (
                            <Button loading={busy} onClick={() => run(() => resendInvitation(user.id), "Đã gửi lại lời mời")}>
                                Gửi lại lời mời
                            </Button>
                        )}
                        {user.status === "LOCKED" ? (
                            <Button loading={busy} onClick={() => run(() => updateUserStatus(user.id, { status: "ACTIVE" }), "Đã mở khoá tài khoản")}>
                                Mở khoá tài khoản
                            </Button>
                        ) : (
                            <Button danger onClick={() => setConfirmLock(true)}>Khoá tài khoản</Button>
                        )}
                    </div>
                </div>
            </Panel>

            {/* A05 theo docs/UI: vai trò bên trái, việc đang phụ trách bên phải; lịch sử chiếm cả chiều ngang. */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "stretch" }}>
                <Panel title="Vai trò & phòng ban">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                        <Field label="Vai trò" value={ROLE_NAME[user.role]} />
                        <Field label="Phòng ban" value={dept} />
                    </div>
                </Panel>

                <Panel title="Việc đang phụ trách" subtitle="Cần chuyển giao trước khi khoá tài khoản" bodyGap={6}>
                    {duties == null ? <Spin size="small" /> : duties.length === 0
                        ? <span style={{ color: COLORS.textSecondary }}>Không tải được số liệu.</span>
                        : duties.map((d) => (
                            <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: 8, background: COLORS.primarySoft, color: COLORS.primary,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}>{d.icon}</span>
                                <span style={{ flex: 1, fontSize: 14 }}>{d.label}</span>
                                <b style={{ color: d.count > 0 ? COLORS.textPrimary : COLORS.textMuted }}>{d.count}</b>
                            </div>
                        ))}
                </Panel>
            </div>

            <Panel title="Lịch sử tài khoản" subtitle="Thao tác gần nhất trong nhật ký hệ thống" bodyGap={4}>
                {history == null ? <Spin size="small" /> : history.length === 0
                    ? <span style={{ color: COLORS.textSecondary }}>Chưa có thao tác nào được ghi lại.</span>
                    : history.map((h) => (
                        <div key={h.id} style={{ display: "flex", gap: 16, fontSize: 13 }}>
                            <span style={{ width: 120, color: COLORS.textSecondary }}>{dayjs(h.createdAt).format("DD/MM/YYYY HH:mm")}</span>
                            <span>{AUDIT_ACTION_LABEL[h.action] ?? h.action}</span>
                        </div>
                    ))}
            </Panel>

            <SmallDialog
                open={confirmLock}
                title={`Khoá tài khoản · ${user.fullName}`}
                okText="Khoá tài khoản"
                danger
                okLoading={busy}
                onCancel={() => setConfirmLock(false)}
                onOk={() => run(() => updateUserStatus(user.id, { status: "LOCKED" }), "Đã khoá tài khoản")}
            >
                <span style={{ color: COLORS.textSecondary }}>
                    Sau khi khoá, {user.fullName} không đăng nhập được. Lịch sử thao tác và đánh giá đã nộp vẫn được giữ.
                </span>
                {openDuties > 0 && (
                    <InlineNotice tone="warning">
                        Người này còn {openDuties} việc đang phụ trách. Hãy chuyển giao trước khi khoá.
                    </InlineNotice>
                )}
            </SmallDialog>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
    );
}
