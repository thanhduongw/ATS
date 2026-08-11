import { useEffect, useState } from "react";
import { Card, Col, Row, Spin } from "antd";
import {
    FileSearchOutlined, SolutionOutlined, TeamOutlined, TrophyOutlined,
    AppstoreOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getDashboardSummary } from "../dashboardApi";
import type { DashboardSummaryResponse } from "../types";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import { COLORS } from "../../../app/theme";

export default function DashboardPage() {
    const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        getDashboardSummary()
            .then((res) => setSummary(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !summary) {
        return (
            <div style={{ padding: 24, textAlign: "center" }}>
                <Spin size="large" />
            </div>
        );
    }

    const chartData = Object.entries(summary.applicationsByStage).map(([stage, count]) => ({ stage, count }));

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Tổng quan tuyển dụng" subtitle="Số liệu nhanh về quy trình tuyển dụng của công ty bạn" />

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <StatCard icon={<SolutionOutlined />} label="Tin đang mở" value={summary.openPostingsCount} accentColor={COLORS.primary} />
                </Col>
                <Col span={6}>
                    <StatCard icon={<FileSearchOutlined />} label="Yêu cầu đang xử lý" value={summary.activeRequisitionsCount} accentColor="#3B82F6" />
                </Col>
                <Col span={6}>
                    <StatCard icon={<TeamOutlined />} label="Tổng ứng viên" value={summary.totalCandidates} accentColor="#8B5CF6" />
                </Col>
                <Col span={6}>
                    <StatCard icon={<TrophyOutlined />} label="Tỷ lệ tuyển thành công" value={`${summary.successRatePercent.toFixed(2)}%`} accentColor="#F59E0B" />
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <StatCard icon={<AppstoreOutlined />} label="Tổng hồ sơ ứng tuyển" value={summary.totalApplications} accentColor={COLORS.primary} />
                </Col>
                <Col span={8}>
                    <StatCard icon={<CheckCircleOutlined />} label="Đã tuyển dụng" value={summary.hiredCount} accentColor="#22C55E" />
                </Col>
                <Col span={8}>
                    <StatCard icon={<CloseCircleOutlined />} label="Đã từ chối" value={summary.rejectedCount} accentColor="#DC2626" />
                </Col>
            </Row>

            <Card title="Ứng viên theo giai đoạn" variant="borderless" style={{ boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }}>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="stage" angle={-15} textAnchor="end" interval={0} height={70} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
}
