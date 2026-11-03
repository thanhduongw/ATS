import { useCallback, useEffect, useState } from "react";
import { App, Button, Spin } from "antd";
import type { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { getUsers, resendInvitation, updateUserStatus } from "../../auth/authApi";
import type { ApiMessageResponse, UserSummaryResponse } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { COLORS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import { Avatar, InlineNotice, Panel, ScreenTitle, SmallDialog } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { ROLE_NAME, USER_STATUS_VIEW } from "../adminLabels";

/**
 * A05 · Chi tiết người dùng (bản cơ bản). Khoá tài khoản kèm chuyển giao việc (A06) làm ở Đợt 3
 * theo quyết định C3 = bản rút gọn; lúc này khoá trực tiếp, có xác nhận nút đỏ (DS06).
 */
export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [user, setUser] = useState<UserSummaryResponse | null>(null);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [confirmLock, setConfirmLock] = useState(false);

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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
            <ScreenTitle title="Chi tiết người dùng" />
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
                    <div style={{ display: "flex", gap: 8 }}>
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

            <Panel title="Vai trò & phòng ban">
                <Row label="Vai trò" value={ROLE_NAME[user.role]} />
                <Row label="Phòng ban" value={dept} />
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
            </SmallDialog>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", gap: 16, padding: "8px 0", borderTop: `0.5px solid ${COLORS.border}` }}>
            <span style={{ width: 160, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontWeight: 500 }}>{value}</span>
        </div>
    );
}
