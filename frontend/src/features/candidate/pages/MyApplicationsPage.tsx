import { useEffect, useState } from "react";
import { Card, Tag, Timeline, Typography, Spin, Button, Space, App } from "antd";
import {
    ScheduleOutlined, FileTextOutlined, DeleteOutlined
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { getMyApplications } from "../applicationApi";
import { requestOwnDataDeletion } from "../candidateApi";
import type { CandidateApplicationResponse, ApiMessageResponse } from "../types";
import { COLORS, RADIUS } from "../../../app/theme";
import { stageTypeTagColor } from "../../../app/statusLabels";
import EmptyState from "../../../components/ui/EmptyState";
import { useAppDispatch } from "../../../app/hooks";
import { logout } from "../../auth/authSlice";

const { Title, Text } = Typography;

export default function MyApplicationsPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { modal, message } = App.useApp();
    const [applications, setApplications] = useState<CandidateApplicationResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const handleRequestDeletion = () => {
        modal.confirm({
            title: "Yêu cầu xóa dữ liệu cá nhân?",
            content: "Toàn bộ hồ sơ và lịch sử ứng tuyển của bạn sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.",
            okText: "Xóa dữ liệu của tôi",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await requestOwnDataDeletion();
                    message.success("Đã xóa dữ liệu của bạn. Đang đăng xuất...");
                    setTimeout(() => dispatch(logout()), 1500);
                } catch (err) {
                    const e = err as AxiosError<ApiMessageResponse>;
                    message.error(e.response?.data?.message ?? "Không thể xử lý yêu cầu, vui lòng thử lại");
                }
            },
        });
    };

    useEffect(() => {
        getMyApplications()
            .then(res => setApplications(res.data))
            .catch(() => setApplications([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Hồ sơ ứng tuyển của tôi</Title>
                    <Text type="secondary">Theo dõi tiến trình và trạng thái các vị trí bạn đã ứng tuyển</Text>
                </div>
                <Button danger icon={<DeleteOutlined />} onClick={handleRequestDeletion}>
                    Yêu cầu xóa dữ liệu của tôi
                </Button>
            </div>

            {applications.length === 0 ? (
                <Card style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: RADIUS.lg }}>
                    <EmptyState
                        title="Bạn chưa có hồ sơ ứng tuyển nào"
                        description="Hãy vào mục “Việc làm” để ứng tuyển vị trí phù hợp."
                    />
                </Card>
            ) : (
                <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                    {applications.map(app => (
                        <Card key={app.id} hoverable style={{ borderRadius: RADIUS.lg, border: `1px solid ${COLORS.borderLight}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                                <div style={{ minWidth: 0 }}>
                                    <Tag color={stageTypeTagColor(app.currentStageType)} style={{ margin: 0 }}>
                                        {app.currentStageName}
                                    </Tag>
                                    <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>
                                        {app.jobTitle ?? `Hồ sơ #${app.id}`}
                                    </Title>
                                    <Text type="secondary">
                                        Ứng tuyển ngày: {new Date(app.appliedAt).toLocaleDateString("vi-VN")}
                                    </Text>
                                </div>

                                <Space wrap>
                                    {app.currentStageType === "OFFER" && (
                                        <Button
                                            type="primary"
                                            icon={<FileTextOutlined />}
                                            onClick={() => navigate("/my-offers")}
                                        >
                                            Xem Offer
                                        </Button>
                                    )}
                                    {app.currentStageType.includes("INTERVIEW") && (
                                        <Button
                                            icon={<ScheduleOutlined />}
                                            onClick={() => navigate("/my-interviews")}
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
                                        color: app.currentStageType.includes("INTERVIEW") ? "blue" : app.currentStageOrder > 2 ? "green" : "gray",
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
