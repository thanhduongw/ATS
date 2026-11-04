import { useEffect, useMemo, useState } from "react";
import { App, Button, Input, Select, Table } from "antd";
import { SearchOutlined, SafetyOutlined, UserAddOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../../auth/authApi";
import type { UserRole, UserStatus, UserSummaryResponse } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { rowArrowColumn } from "../../../components/ui/listHelpers";
import { Avatar } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { COLORS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import { ROLE_NAME, USER_STATUS_VIEW } from "../adminLabels";

type Tab = "ACTIVE" | "PENDING_VERIFICATION" | "LOCKED" | "ALL";

/** A03 · MÀN CHÍNH · Người dùng — tài khoản nội bộ (ứng viên tự đăng ký ở trang tuyển dụng). */
export default function UsersPage() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [users, setUsers] = useState<UserSummaryResponse[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<Tab>("ACTIVE");
    const [keyword, setKeyword] = useState("");
    const [role, setRole] = useState<UserRole | undefined>();
    const [departmentId, setDepartmentId] = useState<number | undefined>();

    useEffect(() => {
        Promise.all([getUsers(), getCatalogItems("/masterdata/departments")])
            .then(([u, d]) => {
                setUsers(u.data.filter((x) => x.role !== "CANDIDATE"));
                setDepartments(d.data);
            })
            .catch(() => { setFailed(true); message.error("Không tải được danh sách người dùng"); })
            .finally(() => setLoading(false));
    }, [message]);

    const deptName = (id: number | null) =>
        id == null ? "—" : String(departments.find((d) => d.id === id)?.name ?? `#${id}`);

    // Lọc theo ô tìm và ô chọn trước, tab đếm trên kết quả đó.
    const filtered = useMemo(() => {
        const k = keyword.trim().toLowerCase();
        return users.filter((u) =>
            (!k || u.fullName?.toLowerCase().includes(k) || u.email.toLowerCase().includes(k))
            && (!role || u.role === role)
            && (!departmentId || u.departmentId === departmentId));
    }, [users, keyword, role, departmentId]);

    const count = (s: UserStatus) => filtered.filter((u) => u.status === s).length;
    const rows = tab === "ALL" ? filtered : filtered.filter((u) => u.status === tab);

    const columns: ColumnsType<UserSummaryResponse> = [
        {
            title: "Người dùng",
            key: "user",
            render: (_, u) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={u.fullName} colorKey={u.id} size={34} />
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{u.email}</span>
                    </div>
                </div>
            ),
        },
        { title: "Vai trò", key: "role", render: (_, u) => ROLE_NAME[u.role] },
        { title: "Phòng ban", key: "dept", render: (_, u) => deptName(u.departmentId) },
        { title: "Đăng nhập gần nhất", key: "login", render: (_, u) => relativeTime(u.lastLoginAt) },
        {
            title: "Trạng thái",
            key: "status",
            render: (_, u) => <StatusTag {...USER_STATUS_VIEW[u.status]} />,
        },
        rowArrowColumn,
    ];

    return (
        <ListPage
            title="Người dùng"
            subtitle="Tài khoản nội bộ · ứng viên tự đăng ký ở trang tuyển dụng"
            actions={<>
                <Button icon={<SafetyOutlined />} style={{ color: COLORS.primary }} onClick={() => navigate("/admin/users/roles")}>
                    Vai trò & quyền
                </Button>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate("/admin/users/invite")}>
                    Mời người dùng
                </Button>
            </>}
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={setTab}
                    items={[
                        { key: "ACTIVE", label: "Đang hoạt động", count: count("ACTIVE") },
                        { key: "PENDING_VERIFICATION", label: "Chờ kích hoạt", count: count("PENDING_VERIFICATION") },
                        { key: "LOCKED", label: "Đã khoá", count: count("LOCKED") },
                        { key: "ALL", label: "Tất cả", count: filtered.length },
                    ]}
                />
            }
            filters={
                <ListFilters>
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Tìm theo tên hoặc email"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{ width: 280 }}
                    />
                    <Select
                        allowClear
                        placeholder="Vai trò"
                        value={role}
                        onChange={setRole}
                        style={{ width: 220 }}
                        options={(["RECRUITER", "HIRING_MANAGER", "COMPANY_ADMIN"] as UserRole[])
                            .map((r) => ({ value: r, label: ROLE_NAME[r] }))}
                    />
                    <Select
                        allowClear
                        placeholder="Phòng ban"
                        value={departmentId}
                        onChange={setDepartmentId}
                        style={{ width: 220 }}
                        options={departments.map((d) => ({ value: d.id, label: String(d.name) }))}
                    />
                </ListFilters>
            }
            footnote={failed ? undefined : `${rows.length} tài khoản`}
        >
            <Table<UserSummaryResponse>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                rowClassName={() => "row-clickable"}
                onRow={(u) => ({ onClick: () => navigate(`/admin/users/${u.id}`) })}
                locale={{ emptyText: failed ? "Không tải được dữ liệu. Thử tải lại trang." : "Không có tài khoản nào" }}
            />
        </ListPage>
    );
}
