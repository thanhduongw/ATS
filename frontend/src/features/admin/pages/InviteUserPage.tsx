import { useEffect, useState } from "react";
import { App, Button, Form, Input, Select } from "antd";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { inviteUser } from "../../auth/authApi";
import type { ApiMessageResponse, InviteUserRequest, UserRole } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { getPublicCompany } from "../../public/publicApi";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, RADIUS } from "../../../app/theme";
import { Panel, ScreenTitle } from "../../../components/ui/designKit";
import { ROLE_DESCRIPTION, ROLE_NAME } from "../adminLabels";

type InvitableRole = Exclude<UserRole, "CANDIDATE">;
const ROLES: InvitableRole[] = ["RECRUITER", "HIRING_MANAGER", "COMPANY_ADMIN"];

/** A04 · Mời người dùng — form bên trái, "Email người nhận sẽ thấy" bên phải. */
export default function InviteUserPage() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [form] = Form.useForm<InviteUserRequest>();
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [companyName, setCompanyName] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const inviterName = useAppSelector((s) => s.auth.user?.fullName ?? s.auth.user?.email ?? "");

    const values = Form.useWatch([], form) as Partial<InviteUserRequest> | undefined;
    const role = (values?.role ?? "RECRUITER") as InvitableRole;

    useEffect(() => {
        getCatalogItems("/masterdata/departments").then((r) => setDepartments(r.data.filter((d) => d.active))).catch(() => undefined);
        getPublicCompany().then((r) => setCompanyName(r.data?.name ?? "")).catch(() => undefined);
    }, []);

    const deptName = values?.departmentId
        ? String(departments.find((d) => d.id === values.departmentId)?.name ?? "")
        : "";

    const submit = async () => {
        const data = await form.validateFields();
        setSubmitting(true);
        try {
            await inviteUser(data);
            message.success(`Đã gửi lời mời tới ${data.email.trim()}`);
            navigate("/admin/users");
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Gửi lời mời thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle title="Mời người dùng" />
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <Panel title="Thông tin người được mời" style={{ flex: "1 1 520px" }} bodyGap={4}>
                    <Form form={form} layout="vertical" requiredMark={false} initialValues={{ role: "RECRUITER" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <Form.Item name="fullName" label="Họ và tên *" rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="email"
                                label="Email công ty *"
                                extra="Lời mời có hiệu lực 7 ngày"
                                rules={[{ required: true, message: "Vui lòng nhập email" }, { type: "email", message: "Email không hợp lệ" }]}
                            >
                                <Input />
                            </Form.Item>
                        </div>

                        <Form.Item name="role" label="Vai trò">
                            <RoleCards />
                        </Form.Item>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <Form.Item
                                name="departmentId"
                                label={role === "HIRING_MANAGER" ? "Phòng ban *" : "Phòng ban"}
                                extra="Bắt buộc với Đại diện phòng ban"
                                rules={[{ required: role === "HIRING_MANAGER", message: "Vui lòng chọn phòng ban" }]}
                            >
                                <Select allowClear options={departments.map((d) => ({ value: d.id, label: String(d.name) }))} />
                            </Form.Item>
                            <Form.Item name="jobTitle" label="Chức danh">
                                <Input />
                            </Form.Item>
                        </div>

                        <Form.Item name="message" label="Lời nhắn kèm lời mời (không bắt buộc)">
                            <Input.TextArea rows={3} maxLength={2000} />
                        </Form.Item>
                    </Form>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Button onClick={() => navigate("/admin/users")}>Huỷ</Button>
                        <Button type="primary" loading={submitting} onClick={submit}>Gửi lời mời</Button>
                    </div>
                </Panel>

                <Panel title="Email người nhận sẽ thấy" style={{ flex: "0 1 420px" }}>
                    <div style={{ borderRadius: RADIUS.md, background: COLORS.body, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                        <span style={{ fontWeight: 700, color: COLORS.primary }}>{companyName}</span>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>Bạn được mời tham gia hệ thống tuyển dụng</span>
                        <span>
                            Chào {values?.fullName || "…"}, {inviterName} mời bạn tham gia với vai trò{" "}
                            <b>{ROLE_NAME[role]}{deptName ? ` · ${deptName}` : ""}</b>.
                        </span>
                        {values?.message && <span style={{ fontStyle: "italic" }}>“{values.message}”</span>}
                        <span
                            style={{
                                alignSelf: "flex-start", display: "inline-flex", alignItems: "center", height: 36, padding: "0 18px",
                                borderRadius: 18, background: COLORS.primary, color: "#FFFFFF", fontWeight: 500,
                            }}
                        >
                            Đặt mật khẩu & bắt đầu
                        </span>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Liên kết hết hạn sau 7 ngày.</span>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

/** Ba thẻ vai trò (A04) — chọn một. */
function RoleCards({ value, onChange }: { value?: InvitableRole; onChange?: (v: InvitableRole) => void }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {ROLES.map((r) => {
                const selected = value === r;
                return (
                    <button
                        key={r}
                        type="button"
                        onClick={() => onChange?.(r)}
                        aria-pressed={selected}
                        style={{
                            textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: 14, borderRadius: 16,
                            border: `1.5px solid ${selected ? COLORS.primary : "transparent"}`,
                            background: selected ? COLORS.primaryFaint : COLORS.fill,
                            display: "flex", flexDirection: "column", gap: 4,
                        }}
                    >
                        <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{ROLE_NAME[r]}</span>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{ROLE_DESCRIPTION[r]}</span>
                    </button>
                );
            })}
        </div>
    );
}
