import { useEffect, useState, useCallback } from "react";
import { Card, Tabs, Form, Input, Button, Table, Tag, Modal, App, Space, Avatar, Divider, Badge } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    UserOutlined, LockOutlined, MailOutlined, BankOutlined,
    EditOutlined, CheckCircleOutlined, StopOutlined,
    TeamOutlined, SettingOutlined, BuildOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
    getMyProfile, updateMyProfile, changePassword,
    getCompany, updateCompany, getUsers, updateUserStatus,
} from "../authApi";
import type {
    UserProfileResponse, CompanyResponse, UserSummaryResponse,
    ApiMessageResponse, UserRole,
} from "../types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, GRADIENTS } from "../../../app/theme";
import { ROLE_LABELS } from "../../../app/roles";

const ROLE_COLORS: Record<string, string> = {
    COMPANY_ADMIN: "purple",
    RECRUITER: "blue",
    HIRING_MANAGER: "cyan",
    CANDIDATE: "default",
    PLATFORM_ADMIN: "red",
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "success",
    LOCKED: "error",
    UNVERIFIED: "warning",
};

export default function AuthManagementPage() {
    const { message } = App.useApp();
    const currentUserRole = useAppSelector((state) => state.auth.user?.role);

    const [profile, setProfile] = useState<UserProfileResponse | null>(null);
    const [company, setCompany] = useState<CompanyResponse | null>(null);
    const [users, setUsers] = useState<UserSummaryResponse[]>([]);

    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingCompany, setLoadingCompany] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [passwordForm] = Form.useForm();
    const [profileForm] = Form.useForm();
    // ❌ Bỏ companyForm hook — dùng initialValues + key thay thế

    const fetchProfile = useCallback(async () => {
        setLoadingProfile(true);
        try {
            const res = await getMyProfile();
            setProfile(res.data);
        } catch {
            message.error("Không thể lấy thông tin cá nhân");
        } finally {
            setLoadingProfile(false);
        }
    }, [message]);

    const fetchCompany = useCallback(async () => {
        setLoadingCompany(true);
        try {
            const res = await getCompany();
            setCompany(res.data);
        } catch {
            message.error("Không thể lấy thông tin công ty");
        } finally {
            setLoadingCompany(false);
        }
    }, [message]);

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const res = await getUsers();
            setUsers(res.data);
        } catch {
            message.error("Không thể lấy danh sách người dùng");
        } finally {
            setLoadingUsers(false);
        }
    }, [message]);

    useEffect(() => {
        fetchProfile();
        fetchCompany();
        fetchUsers();
    }, [fetchProfile, fetchCompany, fetchUsers]);

    useEffect(() => {
        if (profile) {
            profileForm.setFieldsValue({
                fullName: profile.fullName,
            });
        }
    }, [profile, profileForm]);

    // ❌ Bỏ useEffect set companyForm — thay bằng initialValues + key trên Card

    const handleUpdateProfile = async (values: { fullName: string }) => {
        try {
            const res = await updateMyProfile(values);
            setProfile(res.data);
            message.success("Cập nhật thông tin cá nhân thành công");
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Cập nhật thất bại");
        }
    };

    const handleUpdateCompany = async (values: { name: string }) => {
        try {
            const res = await updateCompany(values);
            setCompany(res.data);
            message.success("Cập nhật thông tin công ty thành công");
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Cập nhật thất bại");
        }
    };

    const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
        try {
            await changePassword(values);
            message.success("Đổi mật khẩu thành công");
            setIsPasswordModalOpen(false);
            passwordForm.resetFields();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Đổi mật khẩu thất bại");
        }
    };

    const handleToggleUserStatus = async (userId: number, currentStatus?: string) => {
        const nextStatus = currentStatus === "LOCKED" ? "ACTIVE" : "LOCKED";
        try {
            await updateUserStatus(userId, { status: nextStatus });
            message.success(`Đã ${nextStatus === "LOCKED" ? "khóa" : "mở khóa"} tài khoản`);
            fetchUsers();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Thao tác thất bại");
        }
    };

    const getInitials = (name?: string, email?: string) => {
        const src = name || email || "?";
        const parts = src.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return src.substring(0, 2).toUpperCase();
    };

    const userColumns: ColumnsType<UserSummaryResponse> = [
        {
            title: "Nhân sự",
            key: "user",
            render: (_, record) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                        size={36}
                        style={{ background: GRADIENTS.primary, color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0 }}
                    >
                        {getInitials(record.fullName, record.email)}
                    </Avatar>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.textPrimary }}>{record.fullName || "—"}</div>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{record.email}</div>
                    </div>
                </div>
            ),
        },
        {
            title: "Vai trò",
            dataIndex: "role",
            key: "role",
            render: (role: UserRole) => (
                <Tag color={ROLE_COLORS[role] || "default"} style={{ fontWeight: 500 }}>
                    {ROLE_LABELS[role]?.vi ?? role}
                </Tag>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
                <Badge
                    status={(STATUS_COLORS[status] as "success" | "error" | "warning") ?? "default"}
                    text={
                        status === "ACTIVE" ? "Đang hoạt động"
                            : status === "LOCKED" ? "Đã khóa"
                                : status === "UNVERIFIED" ? "Chưa xác thực"
                                    : status
                    }
                />
            ),
        },
        {
            title: "Thao tác",
            key: "action",
            render: (_, record) =>
                currentUserRole === "COMPANY_ADMIN" ? (
                    <Button
                        size="small"
                        danger={record.status !== "LOCKED"}
                        icon={record.status === "LOCKED" ? <CheckCircleOutlined /> : <StopOutlined />}
                        onClick={() => handleToggleUserStatus(record.id, record.status)}
                    >
                        {record.status === "LOCKED" ? "Mở khóa" : "Khóa tài khoản"}
                    </Button>
                ) : null,
        },
    ];

    const tabItems = [
        {
            key: "profile",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <UserOutlined />Hồ Sơ Cá Nhân
                </span>
            ),
            children: (
                <div style={{ maxWidth: 560 }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 20,
                        padding: "20px 24px", background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
                        borderRadius: 12, marginBottom: 24, border: "1px solid #BBF7D0",
                    }}>
                        <Avatar
                            size={64}
                            style={{ background: GRADIENTS.primary, color: "#fff", fontWeight: 700, fontSize: 24, flexShrink: 0 }}
                        >
                            {getInitials(profile?.fullName, profile?.email)}
                        </Avatar>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.textPrimary }}>
                                {profile?.fullName || "—"}
                            </div>
                            <div style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
                                <MailOutlined style={{ marginRight: 6 }} />{profile?.email}
                            </div>
                            <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                                <Tag color={ROLE_COLORS[profile?.role || ""] || "default"}>
                                    {ROLE_LABELS[profile?.role as UserRole]?.vi ?? profile?.role}
                                </Tag>
                                <Tag color={STATUS_COLORS[profile?.status || ""] || "default"}>
                                    {profile?.status === "ACTIVE" ? "Đang hoạt động" : profile?.status}
                                </Tag>
                            </div>
                        </div>
                    </div>

                    <Card loading={loadingProfile} title={<><EditOutlined style={{ marginRight: 8, color: COLORS.primary }} />Cập nhật thông tin</>} style={{ marginBottom: 16, border: "1px solid #E5E7EB" }}>
                        <Form layout="vertical" form={profileForm} onFinish={handleUpdateProfile}>
                            <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined style={{ color: "#9CA3AF" }} />} size="large" placeholder="Nguyễn Văn A" />
                            </Form.Item>
                            <Space>
                                <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                                    Cập Nhật Thông Tin
                                </Button>
                                <Button icon={<LockOutlined />} onClick={() => setIsPasswordModalOpen(true)}>
                                    Đổi Mật Khẩu
                                </Button>
                            </Space>
                        </Form>
                    </Card>

                    <Card title="Thông tin tài khoản" style={{ border: "1px solid #E5E7EB" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: COLORS.textSecondary }}>Mã Tenant:</span>
                                <Tag color="orange">{profile?.tenantId}</Tag>
                            </div>
                            <Divider style={{ margin: "4px 0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: COLORS.textSecondary }}>Email:</span>
                                <span style={{ fontWeight: 500 }}>{profile?.email}</span>
                            </div>
                            <Divider style={{ margin: "4px 0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: COLORS.textSecondary }}>Vai trò:</span>
                                <Tag color={ROLE_COLORS[profile?.role || ""] || "default"}>
                                    {ROLE_LABELS[profile?.role as UserRole]?.vi ?? profile?.role}
                                </Tag>
                            </div>
                        </div>
                    </Card>
                </div>
            ),
        },
        {
            key: "company",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <BuildOutlined />Thông Tin Doanh Nghiệp
                </span>
            ),
            children: (
                <div style={{ maxWidth: 560 }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 20,
                        padding: "20px 24px", background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
                        borderRadius: 12, marginBottom: 24, border: "1px solid #BFDBFE",
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 14,
                            background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: 700, fontSize: 22, flexShrink: 0,
                        }}>
                            <BankOutlined />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.textPrimary }}>{company?.name || "—"}</div>
                            <div style={{ marginTop: 6 }}>
                                <Tag color="orange" icon={<SettingOutlined />}>
                                    Mã: {company?.tenantCode}
                                </Tag>
                                <Tag color="blue">ID: {company?.id}</Tag>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Dùng key để remount + initialValues thay cho form hook */}
                    <Card
                        key={`company-${company?.id ?? "loading"}`}
                        loading={loadingCompany}
                        title={<><EditOutlined style={{ marginRight: 8, color: "#3B82F6" }} />Cập nhật công ty</>}
                        style={{ border: "1px solid #E5E7EB" }}
                    >
                        <Form
                            layout="vertical"
                            onFinish={handleUpdateCompany}
                            initialValues={{ name: company?.name }}
                        >
                            <Form.Item label="Tên công ty" name="name" rules={[{ required: true }]}>
                                <Input
                                    prefix={<BankOutlined style={{ color: "#9CA3AF" }} />}
                                    size="large"
                                    disabled={currentUserRole !== "COMPANY_ADMIN"}
                                    placeholder="Tên đầy đủ công ty"
                                />
                            </Form.Item>
                            {currentUserRole === "COMPANY_ADMIN" ? (
                                <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                                    Lưu Thông Tin Công Ty
                                </Button>
                            ) : (
                                <p style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                                    Chỉ Company Admin mới có quyền sửa tên công ty.
                                </p>
                            )}
                        </Form>
                    </Card>
                </div>
            ),
        },
        {
            key: "users",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <TeamOutlined />Quản Lý Nhân Sự
                </span>
            ),
            children: (
                <Card loading={loadingUsers} style={{ border: "1px solid #E5E7EB" }}>
                    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>Danh sách nhân sự</div>
                            <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Tổng: {users.length} người</div>
                        </div>
                    </div>
                    <Table
                        dataSource={users}
                        columns={userColumns}
                        rowKey="id"
                        pagination={{ pageSize: 10, size: "small" }}
                    />
                </Card>
            ),
        },
    ];

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div className="page-header-title">
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: GRADIENTS.primary,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 20,
                    }}>
                        <SettingOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Cài đặt tài khoản</h2>
                        <div className="page-header-subtitle">Quản lý thông tin cá nhân, công ty và nhân sự</div>
                    </div>
                </div>
            </div>

            <Card style={{ border: "none" }}>
                <Tabs items={tabItems} size="large" />
            </Card>

            {/* ✅ forceRender để Form mount ngay từ đầu, tránh warning */}
            <Modal
                title={<><LockOutlined style={{ marginRight: 8, color: COLORS.primary }} />Đổi mật khẩu</>}
                open={isPasswordModalOpen}
                onCancel={() => setIsPasswordModalOpen(false)}
                footer={null}
                width={440}
                forceRender
            >
                <Form layout="vertical" form={passwordForm} onFinish={handleChangePassword} style={{ marginTop: 16 }}>
                    <Form.Item
                        label="Mật khẩu hiện tại"
                        name="currentPassword"
                        rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
                    >
                        <Input.Password prefix={<LockOutlined style={{ color: "#9CA3AF" }} />} size="large" />
                    </Form.Item>
                    <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        rules={[
                            { required: true, message: "Vui lòng nhập mật khẩu mới" },
                            { min: 6, message: "Mật khẩu mới phải từ 6 ký tự" },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined style={{ color: "#9CA3AF" }} />} size="large" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                            <Button onClick={() => setIsPasswordModalOpen(false)}>Hủy</Button>
                            <Button type="primary" htmlType="submit">Xác Nhận Đổi</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}