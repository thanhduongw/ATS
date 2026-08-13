import { useEffect, useState } from "react";
import { Card, Col, Row, Spin } from "antd";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
    ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, Area, AreaChart
} from "recharts";
import {
    FileSearchOutlined, SolutionOutlined, TeamOutlined, TrophyOutlined,
    CheckCircleOutlined, CloseCircleOutlined, RiseOutlined, ArrowUpOutlined,
    ArrowDownOutlined, CalendarOutlined, FileTextOutlined, AppstoreOutlined,
} from "@ant-design/icons";
import { getDashboardSummary } from "../dashboardApi";
import type { DashboardSummaryResponse } from "../types";
import { GRADIENTS, COLORS } from "../../../app/theme";
import { useAppSelector } from "../../../app/hooks";
import { useNavigate } from "react-router-dom";

/* ── Stat Card ──────────────────────────────────────────── */
interface StatCardProps {
    title: string;
    value: number | string;
    suffix?: string;
    icon: React.ReactNode;
    gradient: string;
    trend?: number;
    precision?: number;
}

function StatCard({ title, value, suffix, icon, gradient, trend, precision }: StatCardProps) {
    return (
        <Card className="stat-card" style={{ border: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="stat-icon" style={{ background: gradient }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500 }}>{title}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
                            {precision !== undefined ? Number(value).toFixed(precision) : value}
                        </span>
                        {suffix && <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{suffix}</span>}
                    </div>
                    {trend !== undefined && (
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                            {trend >= 0
                                ? <ArrowUpOutlined style={{ color: COLORS.success }} />
                                : <ArrowDownOutlined style={{ color: COLORS.error }} />}
                            <span style={{ color: trend >= 0 ? COLORS.success : COLORS.error, fontWeight: 600 }}>
                                {/* {Math.abs(trend)}% */}
                                0
                            </span>
                            <span style={{ color: COLORS.textMuted }}>so với tháng trước</span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

/* ── Quick Action ───────────────────────────────────────── */
interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    color: string;
    onClick: () => void;
}
function QuickAction({ icon, label, color, onClick }: QuickActionProps) {
    return (
        <div
            onClick={onClick}
            style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                padding: "20px 12px", borderRadius: 12, cursor: "pointer",
                border: `1px solid #E5E7EB`, background: "#fff",
                transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = color;
                (e.currentTarget as HTMLDivElement).style.background = `${color}08`;
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "#E5E7EB";
                (e.currentTarget as HTMLDivElement).style.background = "#fff";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
        >
            <div style={{
                width: 44, height: 44, borderRadius: 12, background: `${color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, color,
            }}>
                {icon}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, textAlign: "center", lineHeight: 1.3 }}>
                {label}
            </span>
        </div>
    );
}

/* ── Pie chart colors ───────────────────────────────────── */
const PIE_COLORS = ["#0E7A5F", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#10B981"];

/* ── Main Dashboard ─────────────────────────────────────── */
export default function DashboardPage() {
    const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const user = useAppSelector(s => s.auth.user);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        getDashboardSummary()
            .then((res) => setSummary(res.data))
            .finally(() => setLoading(false));
    }, []);

    /* Greeting */
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

    /* Chart data */
    const barChartData = summary
        ? Object.entries(summary.applicationsByStage).map(([stage, count]) => ({ stage, count }))
        : [];

    const pieData = barChartData.slice(0, 6);

    /* Trend data — sinh từ dữ liệu thực (TODO: thêm API /dashboard/weekly-trend) */
    const lineData = summary
        ? Object.entries(summary.applicationsByStage)
            .slice(0, 6)
            .map(([stage, count], idx) => ({ week: `T${idx + 1}`, applications: count, stage }))
        : [];

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            {/* ── Welcome Banner ───────────────── */}
            <div style={{
                background: GRADIENTS.header,
                borderRadius: 16, padding: "28px 32px", marginBottom: 24,
                position: "relative", overflow: "hidden",
                boxShadow: "0 8px 24px rgba(11,59,54,0.2)",
            }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                        {greeting},
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                        {user?.fullName || user?.email || "Admin"} 👋
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                        Hôm nay là {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </div>
                </div>
                {/* Decorative circles */}
                <div style={{
                    position: "absolute", top: -30, right: -30, width: 160, height: 160,
                    borderRadius: "50%", background: "rgba(217,249,157,0.08)",
                }} />
                <div style={{
                    position: "absolute", bottom: -50, right: 100, width: 200, height: 200,
                    borderRadius: "50%", background: "rgba(16,185,129,0.06)",
                }} />
            </div>

            {/* ── Stats Row ────────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Tin đang mở"
                        value={summary?.openPostingsCount ?? 0}
                        icon={<FileSearchOutlined />}
                        gradient={GRADIENTS.stat1}
                        trend={12}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Yêu cầu tuyển dụng"
                        value={summary?.activeRequisitionsCount ?? 0}
                        icon={<SolutionOutlined />}
                        gradient={GRADIENTS.stat4}
                        trend={-5}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Tổng ứng viên"
                        value={summary?.totalCandidates ?? 0}
                        icon={<TeamOutlined />}
                        gradient={GRADIENTS.stat2}
                        trend={8}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Tỷ lệ tuyển thành công"
                        value={summary?.successRatePercent ?? 0}
                        suffix="%"
                        precision={1}
                        icon={<TrophyOutlined />}
                        gradient={GRADIENTS.stat3}
                        trend={3}
                    />
                </Col>
            </Row>

            {/* ── Second Stats Row ─────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card style={{ textAlign: "center", border: "none" }}
                        className="stat-card">
                        <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.primary }}>{summary?.totalApplications ?? 0}</div>
                        <div style={{ color: COLORS.textSecondary, marginTop: 4 }}>Tổng hồ sơ ứng tuyển</div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ textAlign: "center", border: "none" }} className="stat-card">
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center", marginBottom: 4 }}>
                            <CheckCircleOutlined style={{ color: COLORS.success, fontSize: 20 }} />
                            <span style={{ fontSize: 32, fontWeight: 700, color: COLORS.success }}>{summary?.hiredCount ?? 0}</span>
                        </div>
                        <div style={{ color: COLORS.textSecondary }}>Đã tuyển dụng</div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ textAlign: "center", border: "none" }} className="stat-card">
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center", marginBottom: 4 }}>
                            <CloseCircleOutlined style={{ color: COLORS.error, fontSize: 20 }} />
                            <span style={{ fontSize: 32, fontWeight: 700, color: COLORS.error }}>{summary?.rejectedCount ?? 0}</span>
                        </div>
                        <div style={{ color: COLORS.textSecondary }}>Đã từ chối</div>
                    </Card>
                </Col>
            </Row>

            {/* ── Charts + Quick Actions Row ─── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Bar Chart */}
                <Col xs={24} lg={14}>
                    <Card
                        title={
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <RiseOutlined style={{ color: COLORS.primary }} />
                                <span>Ứng viên theo giai đoạn</span>
                            </div>
                        }
                        style={{ height: "100%", border: "none" }}
                    >
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={barChartData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis dataKey="stage" angle={-20} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: "#6B7280" }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                                <RechartTooltip
                                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                />
                                <Bar dataKey="count" fill={COLORS.primary} radius={[6, 6, 0, 0]}>
                                    {barChartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Pie Chart */}
                <Col xs={24} lg={10}>
                    <Card
                        title={
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <AppstoreOutlined style={{ color: COLORS.primary }} />
                                <span>Phân bổ ứng viên</span>
                            </div>
                        }
                        style={{ height: "100%", border: "none" }}
                    >
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="count"
                                        nameKey="stage"
                                        cx="50%"
                                        cy="45%"
                                        outerRadius={80}
                                        innerRadius={45}
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: COLORS.textMuted }}>
                                Chưa có dữ liệu
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* ── Trend Chart ──────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={14}>
                    <Card
                        title={
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <RiseOutlined style={{ color: COLORS.info }} />
                                <span>Xu hướng ứng tuyển theo tuần</span>
                            </div>
                        }
                        style={{ border: "none" }}
                    >
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={lineData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorApp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#6B7280" }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                                <RechartTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                                <Area type="monotone" dataKey="applications" stroke={COLORS.primary} strokeWidth={2.5} fill="url(#colorApp)" dot={{ r: 4, fill: COLORS.primary }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* ── Quick Actions ──────────────── */}
                <Col xs={24} lg={10}>
                    <Card title="Truy cập nhanh" style={{ border: "none", height: "100%" }}>
                        <Row gutter={[10, 10]}>
                            <Col span={12}>
                                <QuickAction
                                    icon={<SolutionOutlined />}
                                    label="Yêu cầu tuyển dụng"
                                    color={COLORS.primary}
                                    onClick={() => navigate("/recruitment")}
                                />
                            </Col>
                            <Col span={12}>
                                <QuickAction
                                    icon={<AppstoreOutlined />}
                                    label="Kanban Ứng tuyển"
                                    color="#3B82F6"
                                    onClick={() => navigate("/applications")}
                                />
                            </Col>
                            <Col span={12}>
                                <QuickAction
                                    icon={<CalendarOutlined />}
                                    label="Lịch Phỏng vấn"
                                    color="#8B5CF6"
                                    onClick={() => navigate("/interviews")}
                                />
                            </Col>
                            <Col span={12}>
                                <QuickAction
                                    icon={<FileTextOutlined />}
                                    label="Quản lý Offer"
                                    color="#F59E0B"
                                    onClick={() => navigate("/offers")}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
