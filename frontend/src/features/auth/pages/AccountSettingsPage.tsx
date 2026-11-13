import { useEffect, useState } from "react";
import { App, Button, Form, Input } from "antd";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { changePassword, getMyProfile, logoutRequest, updateMyProfile } from "../authApi";
import type { ApiMessageResponse, UserProfileResponse } from "../types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { logout, setUserProfile } from "../authSlice";
import { ROLE_LABELS } from "../../../app/roles";
import { COLORS } from "../../../app/theme";
import { Panel, ScreenTitle, SmallDialog } from "../../../components/ui/designKit";
import { departmentLabel } from "../../overview/useCompanyOverview";
import { requestOwnDataDeletion } from "../../candidate/candidateApi";
import AvatarUploader from "../components/AvatarUploader";
import { getPublicCompany } from "../../public/publicApi";

/**
 * R32 · Cài đặt tài khoản (mọi vai trò nội bộ): thông tin cá nhân · đổi mật khẩu · đăng xuất.
 * Email và phòng ban chỉ xem (do Quản trị doanh nghiệp đổi). Chưa có "Đổi ảnh" — tài khoản chưa có trường ảnh đại diện.
 *
 * C18 · Quyền riêng tư & bảo mật (ứng viên, cùng đường dẫn /settings): đổi mật khẩu · thời gian lưu dữ liệu ·
 * xoá tài khoản và dữ liệu (gõ "XOA DU LIEU" để xác nhận). Thông tin cá nhân của ứng viên sửa ở "Hồ sơ của tôi".
 * Khác HTML: chưa có ngày đồng ý xử lý dữ liệu và trang chính sách (backend chưa lưu ngày đồng ý).
 */
const DELETE_PHRASE = "XOA DU LIEU";
type PasswordForm = { currentPassword: string; newPassword: string; confirm: string };

const errMsg = (e: unknown, fallback: string) => (e as AxiosError<ApiMessageResponse>).response?.data?.message ?? fallback;

export default function AccountSettingsPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const refreshToken = useAppSelector((s) => s.auth.refreshToken);
    const [profile, setProfile] = useState<UserProfileResponse>();
    const [deptName, setDeptName] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [changing, setChanging] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [profileForm] = Form.useForm<{ fullName: string; phone?: string }>();
    const [passwordForm] = Form.useForm<PasswordForm>();
    const isCandidate = useAppSelector((s) => s.auth.user?.role === "CANDIDATE");
    const [retentionMonths, setRetentionMonths] = useState<number | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!isCandidate) return;
        getPublicCompany().then((r) => setRetentionMonths(r.data.dataRetentionMonths)).catch(() => undefined);
    }, [isCandidate]);

    const deleteMyData = async () => {
        setDeleting(true);
        try {
            await requestOwnDataDeletion();
            message.success("Đã xoá dữ liệu của bạn");
            dispatch(logout());
            navigate("/careers", { replace: true });
        } catch (e) {
            message.error(errMsg(e, "Không xoá được dữ liệu, vui lòng thử lại"));
        } finally { setDeleting(false); }
    };

    useEffect(() => {
        getMyProfile().then(async (r) => {
            setProfile(r.data);
            profileForm.setFieldsValue({ fullName: r.data.fullName, phone: r.data.phone ?? undefined });
            if (r.data.departmentId != null) {
                const d = await getCatalogItems("/masterdata/departments").catch(() => null);
                setDeptName(d ? String(d.data.find((x) => x.id === r.data.departmentId)?.name ?? "") || null : null);
            }
        }).catch((e) => message.error(errMsg(e, "Không tải được thông tin tài khoản")));
    }, [message, profileForm]);

    const saveProfile = async (v: { fullName: string; phone?: string }) => {
        setSaving(true);
        try {
            const r = await updateMyProfile({ fullName: v.fullName.trim(), phone: v.phone?.trim() || null });
            setProfile(r.data);
            dispatch(setUserProfile(r.data));
            message.success("Đã lưu thay đổi");
        } catch (e) {
            message.error(errMsg(e, "Lưu thất bại"));
        } finally { setSaving(false); }
    };

    const submitPassword = async (v: PasswordForm) => {
        setChanging(true);
        try {
            await changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
            dispatch(logout());
            message.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại");
            navigate("/login", { replace: true });
        } catch (e) {
            message.error(errMsg(e, "Đổi mật khẩu thất bại"));
        } finally { setChanging(false); }
    };

    const doLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            if (refreshToken) await logoutRequest(refreshToken);
        } finally {
            dispatch(logout());
            navigate("/login", { replace: true });
        }
    };

    const roleText = profile ? ROLE_LABELS[profile.role].vi : "";
    const grid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 16 } as const;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
            <ScreenTitle title={isCandidate ? "Quyền riêng tư & bảo mật" : "Cài đặt tài khoản"} />

            {!isCandidate && <Panel title="Thông tin cá nhân" bodyGap={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <AvatarUploader profile={profile} onChange={setProfile} />
                    <div style={{ display: "flex", flexDirection: "column", marginLeft: "auto", textAlign: "right" }}>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>{profile?.fullName}</span>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            {[roleText, deptName ? departmentLabel(deptName) : null].filter(Boolean).join(" · ")}
                        </span>
                    </div>
                </div>
                <Form form={profileForm} layout="vertical" onFinish={saveProfile} requiredMark={false}>
                    <div style={grid}>
                        <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, whitespace: true, message: "Nhập họ và tên" }]}>
                            <Input maxLength={150} />
                        </Form.Item>
                        <Form.Item label="Email"><Input value={profile?.email} disabled /></Form.Item>
                        <Form.Item name="phone" label="Số điện thoại"
                            rules={[{ pattern: /^[0-9+ .()-]{8,20}$/, message: "Số điện thoại không hợp lệ" }]}>
                            <Input maxLength={20} />
                        </Form.Item>
                        <Form.Item label="Phòng ban"><Input value={deptName ?? "—"} disabled /></Form.Item>
                    </div>
                    <Button type="primary" htmlType="submit" loading={saving}>Lưu thay đổi</Button>
                </Form>
            </Panel>}

            <Panel title="Đổi mật khẩu" subtitle="Sau khi đổi, bạn cần đăng nhập lại.">
                <Form form={passwordForm} layout="vertical" onFinish={submitPassword} requiredMark={false}>
                    <div style={grid}>
                        <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
                            style={{ gridColumn: "1 / -1", maxWidth: "calc(50% - 8px)" }}>
                            <Input.Password autoComplete="current-password" />
                        </Form.Item>
                        <Form.Item name="newPassword" label="Mật khẩu mới"
                            rules={[{ required: true, message: "Nhập mật khẩu mới" }, { min: 8, message: "Tối thiểu 8 ký tự" }, { max: 72 }]}>
                            <Input.Password placeholder="Tối thiểu 8 ký tự" maxLength={72} autoComplete="new-password" />
                        </Form.Item>
                        <Form.Item name="confirm" label="Nhập lại mật khẩu mới" dependencies={["newPassword"]}
                            rules={[{ required: true, message: "Nhập lại mật khẩu mới" },
                                ({ getFieldValue }) => ({
                                    validator: (_, v) => !v || v === getFieldValue("newPassword")
                                        ? Promise.resolve() : Promise.reject(new Error("Mật khẩu nhập lại không khớp")),
                                })]}>
                            <Input.Password placeholder="Nhập lại" maxLength={72} autoComplete="new-password" />
                        </Form.Item>
                    </div>
                    <Button htmlType="submit" loading={changing}>{isCandidate ? "Cập nhật mật khẩu" : "Đổi mật khẩu"}</Button>
                </Form>
            </Panel>

            {isCandidate && (
                <Panel title="Đồng ý xử lý dữ liệu">
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                        Bạn đã đồng ý cho doanh nghiệp xử lý hồ sơ khi đăng ký tài khoản.
                        {retentionMonths ? ` Hồ sơ được lưu tối đa ${retentionMonths} tháng kể từ lần ứng tuyển gần nhất, sau đó tự ẩn danh.` : ""}
                    </span>
                </Panel>
            )}

            {isCandidate && (
                <Panel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600 }}>Xoá tài khoản và dữ liệu</span>
                            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Xoá hồ sơ, CV và đơn ứng tuyển. Không khôi phục được.</span>
                        </div>
                        <Button danger onClick={() => { setDeleteText(""); setDeleteOpen(true); }}>Yêu cầu xoá dữ liệu</Button>
                    </div>
                </Panel>
            )}

            <Panel>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>Đăng xuất</span>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Đăng xuất khỏi tài khoản trên thiết bị này.</span>
                    </div>
                    <Button danger onClick={doLogout} loading={loggingOut}>Đăng xuất</Button>
                </div>
            </Panel>

            <SmallDialog
                open={deleteOpen}
                title="Xoá vĩnh viễn dữ liệu?"
                okText="Xoá vĩnh viễn"
                danger
                okDisabled={deleteText.trim() !== DELETE_PHRASE}
                okLoading={deleting}
                onCancel={() => setDeleteOpen(false)}
                onOk={deleteMyData}
            >
                <span style={{ color: COLORS.textSecondary }}>
                    Nhập <b>{DELETE_PHRASE}</b> để xác nhận.
                </span>
                <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={DELETE_PHRASE} />
            </SmallDialog>
        </div>
    );
}
