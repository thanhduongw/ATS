import { useCallback, useEffect, useState } from "react";
import { App, Avatar, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import { BankOutlined, LockOutlined, PlusOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
    changePassword, createInternalUser, getCompany, getMyProfile, getUsers,
    updateCompany, updateMyProfile, updateUserStatus,
} from "../authApi";
import type {
    ApiMessageResponse, CompanyResponse, CreateUserRequest, UpdateCompanyRequest,
    UserProfileResponse, UserRole, UserStatus, UserSummaryResponse,
} from "../types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { logout, setUserProfile } from "../authSlice";
import { useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "../../../app/roles";

const { Text, Title } = Typography;
const INTERNAL_ROLES: Array<{ label: string; value: CreateUserRequest["role"] }> = [
    { label: "Company Admin", value: "COMPANY_ADMIN" },
    { label: "Recruiter", value: "RECRUITER" },
    { label: "Hiring Manager", value: "HIRING_MANAGER" },
];

interface Props { initialTab?: "profile" | "users"; }

export default function AuthManagementPage({ initialTab = "profile" }: Props) {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentRole = useAppSelector((state) => state.auth.user?.role);
    const isAdmin = currentRole === "COMPANY_ADMIN";
    const [profile, setProfile] = useState<UserProfileResponse>();
    const [company, setCompany] = useState<CompanyResponse>();
    const [users, setUsers] = useState<UserSummaryResponse[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [createForm] = Form.useForm<CreateUserRequest>();
    const [passwordForm] = Form.useForm<{ currentPassword: string; newPassword: string }>();

    const loadAdminData = useCallback(async () => {
        if (!isAdmin) return;
        const [companyResponse, usersResponse, departmentResponse] = await Promise.all([
            getCompany(), getUsers(), getCatalogItems("/masterdata/departments"),
        ]);
        setCompany(companyResponse.data);
        setUsers(usersResponse.data);
        setDepartments(departmentResponse.data.filter((department) => department.active));
    }, [isAdmin]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const profileResponse = await getMyProfile();
            setProfile(profileResponse.data);
            await loadAdminData();
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không tải được thông tin tài khoản");
        } finally { setLoading(false); }
    }, [loadAdminData, message]);

    useEffect(() => { load(); }, [load]);

    const updateProfile = async (values: { fullName: string; phone?: string }) => {
        try {
            const response = await updateMyProfile({ ...values, phone: values.phone || null });
            setProfile(response.data);
            dispatch(setUserProfile(response.data));
            message.success("Đã cập nhật hồ sơ");
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Cập nhật thất bại");
        }
    };

    const saveCompany = async (values: UpdateCompanyRequest) => {
        try {
            const response = await updateCompany(values);
            setCompany(response.data);
            message.success("Đã cập nhật thông tin doanh nghiệp");
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Cập nhật thất bại");
        }
    };

    const createUser = async (values: CreateUserRequest) => {
        try {
            await createInternalUser({ ...values, phone: values.phone || null, departmentId: values.departmentId ?? null });
            message.success("Đã tạo tài khoản nội bộ");
            setCreateOpen(false);
            createForm.resetFields();
            await loadAdminData();
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không thể tạo tài khoản");
        }
    };

    const changeStatus = async (id: number, status: UserStatus) => {
        try {
            await updateUserStatus(id, { status });
            message.success("Đã cập nhật trạng thái");
            await loadAdminData();
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không thể cập nhật trạng thái");
        }
    };

    const submitPassword = async (values: { currentPassword: string; newPassword: string }) => {
        try {
            await changePassword(values);
            dispatch(logout());
            message.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại");
            navigate("/login", { replace: true });
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Đổi mật khẩu thất bại");
        }
    };

    const columns: ColumnsType<UserSummaryResponse> = [
        { title: "Người dùng", render: (_, user) => <Space><Avatar>{user.fullName?.[0] || user.email[0]}</Avatar><div><Text strong>{user.fullName}</Text><br /><Text type="secondary">{user.email}</Text></div></Space> },
        { title: "Vai trò", dataIndex: "role", render: (role: UserRole) => <Tag>{ROLE_LABELS[role].vi}</Tag> },
        { title: "Phòng ban", dataIndex: "departmentId", render: (id: number | null) => id == null ? "-" : departments.find((department) => department.id === id)?.name ?? `#${id}` },
        { title: "Trạng thái", dataIndex: "status", render: (status: UserStatus) => <Tag color={status === "ACTIVE" ? "green" : status === "LOCKED" ? "red" : "gold"}>{status}</Tag> },
        { title: "Thao tác", render: (_, user) => <Select size="small" value={user.status} style={{ width: 150 }} onChange={(status) => changeStatus(user.id, status)} options={[
            { value: "ACTIVE", label: "ACTIVE" }, { value: "LOCKED", label: "LOCKED" }, { value: "INACTIVE", label: "INACTIVE" },
        ]} /> },
    ];

    const profileTab = {
        key: "profile",
        label: <span><UserOutlined /> Tài khoản</span>,
        children: <div style={{ maxWidth: 620 }}>
            <Card loading={loading} style={{ marginBottom: 16 }}>
                <Space size={16} align="start">
                    <Avatar size={56}>{profile?.fullName?.[0] || profile?.email?.[0]}</Avatar>
                    <div><Title level={4} style={{ margin: 0 }}>{profile?.fullName}</Title><Text>{profile?.email}</Text><br />{profile && <Tag>{ROLE_LABELS[profile.role].vi}</Tag>}</div>
                </Space>
            </Card>
            <Card title="Thông tin cá nhân">
                <Form
                    key={profile?.id ?? "profile-form"}
                    layout="vertical"
                    initialValues={{ fullName: profile?.fullName, phone: profile?.phone ?? undefined }}
                    onFinish={updateProfile}
                >
                    <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
                    <Space><Button type="primary" htmlType="submit">Lưu thay đổi</Button><Button icon={<LockOutlined />} onClick={() => setPasswordOpen(true)}>Đổi mật khẩu</Button></Space>
                </Form>
            </Card>
        </div>,
    };

    const tabs = [profileTab];
    if (isAdmin) tabs.push(
        { key: "company", label: <span><BankOutlined /> Doanh nghiệp</span>, children: <Card loading={loading} style={{ maxWidth: 700 }}>
            <Form key={company?.id} layout="vertical" initialValues={company} onFinish={saveCompany}>
                <Form.Item name="name" label="Tên doanh nghiệp" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="description" label="Giới thiệu"><Input.TextArea rows={4} /></Form.Item>
                <Form.Item name="logoUrl" label="URL logo"><Input /></Form.Item>
                <Form.Item name="bannerUrl" label="URL banner"><Input /></Form.Item>
                <Form.Item name="dataRetentionMonths" label="Thời gian lưu hồ sơ (tháng)"><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
                <Button type="primary" htmlType="submit">Lưu thông tin</Button>
            </Form>
        </Card> },
        { key: "users", label: <span><TeamOutlined /> Người dùng</span>, children: <Card loading={loading}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><Title level={4} style={{ margin: 0 }}>Tài khoản nội bộ và candidate</Title><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo tài khoản nội bộ</Button></div>
            <Table rowKey="id" columns={columns} dataSource={users} pagination={{ pageSize: 10 }} scroll={{ x: "max-content" }} />
        </Card> },
    );

    return <div className="page-container animate-fade-in">
        <Tabs defaultActiveKey={initialTab} items={tabs} />
        <Modal title="Tạo tài khoản nội bộ" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} forceRender>
            <Form form={createForm} layout="vertical" onFinish={createUser} initialValues={{ status: "ACTIVE" }}>
                <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}><Input /></Form.Item>
                <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
                <Form.Item name="tempPassword" label="Mật khẩu tạm" rules={[{ required: true }, { min: 8 }, { max: 72 }]}><Input.Password maxLength={72} /></Form.Item>
                <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}><Select options={INTERNAL_ROLES} /></Form.Item>
                <Form.Item noStyle shouldUpdate={(before, after) => before.role !== after.role}>{({ getFieldValue }) => {
                    const needsDepartment = ["RECRUITER", "HIRING_MANAGER"].includes(getFieldValue("role"));
                    return <Form.Item name="departmentId" label="Phòng ban" rules={[{ required: needsDepartment, message: "Vai trò này phải thuộc một phòng ban" }]}>
                        <Select allowClear options={departments.map((department) => ({ value: department.id, label: String(department.name) }))} />
                    </Form.Item>;
                }}</Form.Item>
                <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}><Select options={[{ value: "ACTIVE", label: "ACTIVE" }, { value: "INACTIVE", label: "INACTIVE" }]} /></Form.Item>
                <Button type="primary" htmlType="submit" block>Tạo tài khoản</Button>
            </Form>
        </Modal>
        <Modal title="Đổi mật khẩu" open={passwordOpen} onCancel={() => setPasswordOpen(false)} footer={null} forceRender>
            <Form form={passwordForm} layout="vertical" onFinish={submitPassword}>
                <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}><Input.Password /></Form.Item>
                <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true }, { min: 8 }, { max: 72 }]}><Input.Password maxLength={72} /></Form.Item>
                <Button type="primary" htmlType="submit" block>Xác nhận</Button>
            </Form>
        </Modal>
    </div>;
}
