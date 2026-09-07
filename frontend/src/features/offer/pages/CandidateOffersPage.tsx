import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Empty, Space, Spin, Tag, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { getMyOffers } from "../offerCandidateApi";
import type { ApiMessageResponse, CandidateOfferResponse, OfferStatus } from "../types";
import { formatMoney } from "../../../app/money";

const { Text, Title } = Typography;
const STATUS_COLOR: Record<OfferStatus, string> = {
    DRAFT: "default", PENDING_APPROVAL: "gold", APPROVED: "blue", REJECTED: "red", ACCEPTED: "green", DECLINED: "red",
};

export default function CandidateOffersPage() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [items, setItems] = useState<CandidateOfferResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const response = await getMyOffers();
            setItems(response.data);
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không tải được offer");
        } finally { setLoading(false); }
    }, [message]);

    useEffect(() => { load(); }, [load]);
    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin size="large" /></div>;

    return <div className="page-container animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
        <Title level={2}>Offer của tôi</Title>
        {items.length === 0 ? (
            <Empty description="Bạn chưa có offer" />
        ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((offer) => (
                <Card key={offer.id} style={{ width: "100%", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <Space orientation="vertical" size={6}>
                            <Title level={4} style={{ margin: 0 }}>Thư đề nghị nhận việc #{offer.id}</Title>
                            <Text>Hồ sơ #{offer.applicationId}</Text>
                            <Text strong>{formatMoney(offer.salaryOffered)}</Text>
                            <Text type="secondary">Ngày bắt đầu: {new Date(offer.startDate).toLocaleDateString("vi-VN")}</Text>
                            <Tag color={STATUS_COLOR[offer.status]}>{offer.status}</Tag>
                        </Space>
                        <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate(`/my-offers/${offer.id}`)}>Xem offer</Button>
                    </div>
                </Card>
                ))}
            </div>
        )}
    </div>;
}
