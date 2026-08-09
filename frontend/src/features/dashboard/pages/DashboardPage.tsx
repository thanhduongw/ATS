import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Spin, Typography } from "antd";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getDashboardSummary } from "../dashboardApi";
import type { DashboardSummaryResponse } from "../types";

const { Title } = Typography;

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
            <Title level={3}>Tổng quan tuyển dụng</Title>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic title="Tin đang mở" value={summary.openPostingsCount} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Yêu cầu tuyển dụng đang xử lý" value={summary.activeRequisitionsCount} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Tổng ứng viên" value={summary.totalCandidates} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Tỷ lệ tuyển thành công" value={summary.successRatePercent} precision={2} suffix="%" />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic title="Tổng hồ sơ ứng tuyển" value={summary.totalApplications} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="Đã tuyển dụng" value={summary.hiredCount} valueStyle={{ color: "#3f8600" }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="Đã từ chối" value={summary.rejectedCount} valueStyle={{ color: "#cf1322" }} />
                    </Card>
                </Col>
            </Row>

            <Card title="Ứng viên theo giai đoạn">
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" angle={-15} textAnchor="end" interval={0} height={70} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1677ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
}