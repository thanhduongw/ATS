import { useEffect, useState } from "react";
import { Card, Tag, Timeline, Typography, Spin, Empty, Button, Space } from "antd";
import {
    ScheduleOutlined, FileTextOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getApplications } from "../applicationApi";
import type { ApplicationResponse } from "../types";
import { COLORS } from "../../../app/theme";

const { Title, Text } = Typography;

export default function MyApplicationsPage() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getApplications()
            .then(res => setApplications(res.data))
            .catch(() => setApplications([]))
            .finally(() => setLoading(false));
    }, []);

    const getStageColor = (type: string) => {
        switch (type) {
            case "HIRED": return "success";
            case "REJECTED": return "error";
            case "OFFER": return "purple";
            case "INTERVIEW": return "processing";
            default: return "blue";
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Hồ sơ ứng tuyển của tôi</Title>
                <Text type="secondary">Theo dõi tiến trình và trạng thái các vị trí bạn đã ứng tuyển</Text>
            </div>

            {applications.length === 0 ? (
                <Card style={{ textAlign: "center", padding: "60px 0", borderRadius: 12 }}>
                    <Empty description="Bạn chưa có hồ sơ ứng tuyển nào trong hệ thống" />
                </Card>
            ) : (
                <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                    {applications.map(app => (
                        <Card key={app.id} hoverable style={{ borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                <div>
                                    <Tag color={getStageColor(app.currentStageType)} style={{ fontSize: 13, padding: "2px 10px", borderRadius: 4 }}>
                                        {app.currentStageName}
                                    </Tag>
                                    <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>
                                        Hồ sơ #{app.id}
                                    </Title>
                                    <Text type="secondary">
                                        Ứng tuyển ngày: {new Date(app.appliedAt).toLocaleDateString("vi-VN")}
                                    </Text>
                                </div>

                                <Space>
                                    {app.currentStageType === "OFFER" && (
                                        <Button
                                            type="primary"
                                            icon={<FileTextOutlined />}
                                            onClick={() => navigate(`/offers/candidate/${app.id}`)}
                                        >
                                            Xem Offer
                                        </Button>
                                    )}
                                    {app.currentStageType === "INTERVIEW" && (
                                        <Button
                                            icon={<ScheduleOutlined />}
                                            onClick={() => navigate(`/scheduling?applicationId=${app.id}`)}
                                        >
                                            Xác nhận lịch họp
                                        </Button>
                                    )}
                                </Space>
                            </div>

                            <Timeline
                                style={{ marginTop: 16 }}
                                items={[
                                    {
                                        color: "green",
                                        children: "Ứng tuyển thành công (Hồ sơ đã tiếp nhận)",
                                    },
                                    {
                                        color: app.currentStageOrder > 1 ? "green" : "blue",
                                        children: app.currentStageOrder > 1 ? "Đã vượt qua vòng Sơ tuyển CV" : "Đang sơ tuyển CV",
                                    },
                                    {
                                        color: app.currentStageType === "INTERVIEW" || app.currentStageOrder > 2 ? "green" : app.currentStageOrder === 2 ? "blue" : "gray",
                                        children: "Vòng phỏng vấn",
                                    },
                                    {
                                        color: app.currentStageType === "OFFER" || app.currentStageType === "HIRED" ? "green" : "gray",
                                        children: "Offer & Tuyển dụng",
                                    },
                                ]}
                            />
                        </Card>
                    ))}
                </Space>
            )}
        </div>
    );
}
