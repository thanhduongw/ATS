import { useEffect, useState, useCallback } from "react";
import { Card, Tabs, Typography, Form, Input, Button, Table, Tag, Modal, App, Space } from "antd";
import type { AxiosError } from "axios";
import {
    getMyProfile,
    updateMyProfile,
    changePassword,
    getCompany,
    updateCompany,
    getUsers,
    updateUserStatus,
} from "../authApi";
import type {
    UserProfileResponse,
    CompanyResponse,
    UserSummaryResponse,
    ApiMessageResponse,
    UserRole,
} from "../types";
import { useAppSelector } from "../../../app/hooks";

const { Title, Text } = Typography;

export default function AuthManagementPage() {
    const { message } = App.useApp();
    const currentUserRole = useAppSelector((state) => state.auth.user?.role);

    const [profile, setProfile] = useState<UserProfileResponse | null>(null);
    const [company, setCompany] = useState<CompanyResponse | null>(null);
    const [users, setUsers] = useState<UserSummaryResponse[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingCompany, setLoadingCompany] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Modal state for Password change
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm] = Form.useForm();
    const [profileForm] = Form.useForm();
    const [companyForm] = Form.useForm();

    const fetchProfile = useCallback(async () => {
        setLoadingProfile(true);
        try {
            const res = await getMyProfile();
            setProfile(res.data);
            profileForm.setFieldsValue({ fullName: res.data.fullName });
        } catch {
            message.error("Không thể lấy thông tin cá nhân");
        } finally {
            setLoadingProfile(false);
        }
    }, [message, profileForm]);

    const fetchCompany = useCallback(async () => {
        setLoadingCompany(true);
        try {
            const res = await getCompany();
            setCompany(res.data);
            companyForm.setFieldsValue({ name: res.data.name });
        } catch {
            message.error("Không thể lấy thông tin công ty");
        } finally {
            setLoadingCompany(false);
        }
    }, [message, companyForm]);

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

    const userColumns = [
        { title: "ID", dataIndex: "id", key: "id", width: 70 },
        { title: "Họ và Tên", dataIndex: "fullName", key: "fullName" },
        { title: "Email", dataIndex: "email", key: "email" },
        {
            title: "Vai trò",
            dataIndex: "role",
            key: "role",
            render: (role: UserRole) => <Tag color="blue">{role}</Tag>,
        },
        {
            title: "Thao tác",
            key: "action",
            render: (_: unknown, record: UserSummaryResponse) => (
                currentUserRole === "COMPANY_ADMIN" ? (
                    <Button
                        size="small"
                        danger
                        onClick={() => handleToggleUserStatus(record.id)}
                    >
                        Khóa / Mở khóa
                    </Button>
                ) : null
            ),
        },
    ];

    const tabItems = [
        {
            key: "profile",
            label: "Hồ Sơ Cá Nhân",
            children: (
                <Card loading={loadingProfile}>
                    <Title level={4}>Thông tin tài khoản (`/api/auth/me`)</Title>
                    {profile && (
                        <div style={{ marginBottom: 20 }}>
                            <p><strong>Email:</strong> {profile.email}</p>
                            <p><strong>Vai trò:</strong> <Tag color="purple">{profile.role}</Tag></p>
                            <p><strong>Trạng thái:</strong> <Tag color="green">{profile.status}</Tag></p>
                            <p><strong>Mã Tenant (ID):</strong> {profile.tenantId}</p>
                        </div>
                    )}

                    <Form layout="vertical" form={profileForm} onFinish={handleUpdateProfile} style={{ maxWidth: 400 }}>
                        <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Cập Nhật Thông Tin
                            </Button>
                            <Button onClick={() => setIsPasswordModalOpen(true)}>
                                Đổi Mật Khẩu
                            </Button>
                        </Space>
                    </Form>
                </Card>
            ),
        },
        {
            key: "company",
            label: "Thông Tin Doanh Nghiệp",
            children: (
                <Card loading={loadingCompany}>
                    <Title level={4}>Thông tin Công ty (`/api/auth/company`)</Title>
                    {company && (
                        <div style={{ marginBottom: 20 }}>
                            <p><strong>Mã công ty (Tenant Code):</strong> <Tag color="orange">{company.tenantCode}</Tag></p>
                            <p><strong>ID Công ty:</strong> {company.id}</p>
                        </div>
                    )}

                    <Form layout="vertical" form={companyForm} onFinish={handleUpdateCompany} style={{ maxWidth: 400 }}>
                        <Form.Item label="Tên công ty" name="name" rules={[{ required: true }]}>
                            <Input disabled={currentUserRole !== "COMPANY_ADMIN"} />
                        </Form.Item>

                        {currentUserRole === "COMPANY_ADMIN" ? (
                            <Button type="primary" htmlType="submit">
                                Lưu Thông Tin Công Ty
                            </Button>
                        ) : (
                            <Text type="secondary">Chỉ Company Admin mới có quyền sửa tên công ty.</Text>
                        )}
                    </Form>
                </Card>
            ),
        },
        {
            key: "users",
            label: "Quản Lý Nhân Sự Trong Công Ty",
            children: (
                <Card loading={loadingUsers}>
                    <Title level={4}>Danh sách Nhân sự (`/api/auth/users`)</Title>
                    <Table dataSource={users} columns={userColumns} rowKey="id" pagination={false} />
                </Card>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Quản Lý Tài Khoản & Auth Service</Title>
            <Text type="secondary">Thử nghiệm trực tiếp các chức năng quản lý Auth, Profile, Company và Người dùng</Text>
            
            <Tabs items={tabItems} style={{ marginTop: 24 }} />

            {/* Modal đổi mật khẩu */}
            <Modal
                title="Đổi mật khẩu tài khoản"
                open={isPasswordModalOpen}
                onCancel={() => setIsPasswordModalOpen(false)}
                footer={null}
            >
                <Form layout="vertical" form={passwordForm} onFinish={handleChangePassword}>
                    <Form.Item
                        label="Mật khẩu hiện tại"
                        name="currentPassword"
                        rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        rules={[
                            { required: true, message: "Vui lòng nhập mật khẩu mới" },
                            { min: 6, message: "Mật khẩu mới phải từ 6 ký tự" },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => setIsPasswordModalOpen(false)}>Hủy</Button>
                            <Button type="primary" htmlType="submit">Xác Nhận Đổi</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
