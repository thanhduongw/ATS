import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { App, Button, Card, Empty, Space, Spin, Tag, Typography } from "antd";
import { CalendarOutlined, CheckOutlined, LinkOutlined, TeamOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { interviewStatusMeta } from "../../../app/statusLabels";
import { confirmInterview, getMyInterviews } from "../interviewApi";
import type { ApiMessageResponse, CandidateInterviewResponse } from "../types";

const { Text, Title } = Typography;

export default function CandidateInterviewsPage() {
    const { message } = App.useApp();
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState<CandidateInterviewResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingId, setConfirmingId] = useState<number>();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getMyInterviews();
            setItems(response.data);
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không tải được lịch phỏng vấn");
        } finally { setLoading(false); }
    }, [message]);

    useEffect(() => { load(); }, [load]);

    const highlightedIdValue = Number(searchParams.get("highlightId"));
    const highlightedId = Number.isFinite(highlightedIdValue) && highlightedIdValue > 0
        ? highlightedIdValue
        : null;

    useEffect(() => {
        if (loading || highlightedId == null) return;
        document.getElementById(`interview-${highlightedId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [highlightedId, loading]);

    const handleConfirm = async (id: number) => {
        setConfirmingId(id);
        try {
            await confirmInterview(id);
            message.success("Đã xác nhận lịch phỏng vấn");
            await load();
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không thể xác nhận lịch phỏng vấn");
        } finally { setConfirmingId(undefined); }
    };

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin size="large" /></div>;

    return <div className="page-container animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
        <Title level={2}>Lịch phỏng vấn của tôi</Title>
        {items.length === 0 ? (
            <Empty description="Bạn chưa có lịch phỏng vấn" />
        ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((item) => {
                    const status = interviewStatusMeta(item.status, "candidate");
                    return (
                        <Card
                            id={`interview-${item.id}`}
                            key={item.id}
                            style={{
                                width: "100%",
                                borderRadius: 8,
                                borderColor: item.id === highlightedId ? "#1677FF" : undefined,
                                boxShadow: item.id === highlightedId ? "0 0 0 2px rgba(22, 119, 255, 0.16)" : undefined,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                                <Space orientation="vertical" size={8}>
                                    <Title level={4} style={{ margin: 0 }}>Hồ sơ #{item.applicationId}</Title>
                                    <Text><CalendarOutlined /> {new Date(item.scheduledAt).toLocaleString("vi-VN")} ({item.durationMinutes} phút)</Text>
                                    <Text><TeamOutlined /> {item.interviewerNames.join(", ") || "Chưa công bố"}</Text>
                                    <Space wrap>
                                        <Tag>{item.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng"}</Tag>
                                        <Tag color={status.color}>{status.label}</Tag>
                                    </Space>
                                    {item.meetingLink && item.status === "CANDIDATE_CONFIRMED" && (
                                        <Button type="link" icon={<LinkOutlined />} href={item.meetingLink} target="_blank" style={{ padding: 0 }}>Mở phòng họp</Button>
                                    )}
                                </Space>
                                {item.status === "HM_CONFIRMED" && (
                                    <Button type="primary" icon={<CheckOutlined />} loading={confirmingId === item.id} onClick={() => handleConfirm(item.id)}>
                                        Xác nhận tham gia
                                    </Button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        )}
    </div>;
}
