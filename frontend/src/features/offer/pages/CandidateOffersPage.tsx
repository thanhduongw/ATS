import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Card, Empty, Space, Spin, Tag, Typography } from "antd";
import { ClockCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getMyOffers } from "../offerCandidateApi";
import type { ApiMessageResponse, CandidateOfferResponse, OfferStatus } from "../types";
import { formatMoney } from "../../../app/money";
import { COLORS } from "../../../app/theme";
import { useTrailNavigate } from "../../../app/useNavTrail";

const { Text, Title } = Typography;

/**
 * Nhan theo goc nhin ung vien, khong dung tu noi bo. Ung vien khong can biet offer
 * dang o buoc duyet nao ben trong cong ty — voi ho chi co "chua gui" va "cho phan hoi".
 */
const STATUS_LABEL: Record<OfferStatus, string> = {
    DRAFT: "Chưa gửi",
    PENDING_APPROVAL: "Chưa gửi",
    APPROVED: "Đang chờ bạn phản hồi",
    REJECTED: "Đã hủy",
    ACCEPTED: "Bạn đã chấp nhận",
    DECLINED: "Bạn đã từ chối",
};

const STATUS_COLOR: Record<OfferStatus, string> = {
    DRAFT: "default",
    PENDING_APPROVAL: "default",
    APPROVED: "processing",
    REJECTED: "default",
    ACCEPTED: "success",
    DECLINED: "error",
};

/** Thoi gian con lai dien dat theo ngay/gio, du de ung vien biet gap hay khong. */
function timeLeftLabel(deadline: string) {
    const diffMinutes = dayjs(deadline).diff(dayjs(), "minute");
    if (diffMinutes <= 0) return null;
    const days = Math.floor(diffMinutes / (60 * 24));
    const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
    if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
    if (hours > 0) return `Còn ${hours} giờ`;
    return `Còn ${diffMinutes} phút`;
}

export default function CandidateOffersPage() {
    const openOffer = useTrailNavigate();
    const { message } = App.useApp();
    const [items, setItems] = useState<CandidateOfferResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const response = await getMyOffers();
            setItems(response.data);
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không tải được thư mời nhận việc");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        load();
    }, [load]);

    // Offer cần phản hồi luôn nằm trên cùng — đây là việc duy nhất ứng viên phải làm ở đây.
    const sorted = useMemo(() => {
        const needsResponse = (o: CandidateOfferResponse) => o.status === "APPROVED";
        return [...items].sort((a, b) => {
            if (needsResponse(a) !== needsResponse(b)) return needsResponse(a) ? -1 : 1;
            return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
        });
    }, [items]);

    if (loading) {
        return <div style={{ padding: 80, textAlign: "center" }}><Spin size="large" /></div>;
    }

    return (
        <div className="page-container animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
            <Title level={2}>Thư mời nhận việc</Title>

            {sorted.length === 0 ? (
                <Empty description="Bạn chưa nhận được thư mời nhận việc nào" />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sorted.map((offer) => {
                        const pending = offer.status === "APPROVED";
                        const expired = offer.responseDeadline
                            && dayjs(offer.responseDeadline).isBefore(dayjs());
                        const countdown = pending && offer.responseDeadline && !expired
                            ? timeLeftLabel(offer.responseDeadline)
                            : null;

                        return (
                            <Card
                                key={offer.id}
                                style={{
                                    width: "100%",
                                    borderRadius: 10,
                                    borderColor: pending && !expired ? COLORS.primary : undefined,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                                    <Space orientation="vertical" size={6}>
                                        <Title level={4} style={{ margin: 0 }}>
                                            {offer.jobTitle ?? "Thư mời nhận việc"}
                                        </Title>
                                        <Text strong style={{ color: COLORS.primary, fontSize: 16 }}>
                                            {formatMoney(offer.salaryOffered)}
                                        </Text>
                                        <Text type="secondary">
                                            Ngày bắt đầu: {dayjs(offer.startDate).format("DD/MM/YYYY")}
                                            {offer.responseDeadline
                                                && ` · Hạn phản hồi: ${dayjs(offer.responseDeadline).format("HH:mm DD/MM/YYYY")}`}
                                        </Text>
                                        <Space size={8} wrap>
                                            <Tag color={STATUS_COLOR[offer.status]} style={{ margin: 0 }}>
                                                {expired && pending ? "Đã quá hạn phản hồi" : STATUS_LABEL[offer.status]}
                                            </Tag>
                                            {countdown && (
                                                <Text type="warning" style={{ fontSize: 13 }}>
                                                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                    {countdown}
                                                </Text>
                                            )}
                                        </Space>
                                    </Space>

                                    <Button
                                        type={pending && !expired ? "primary" : "default"}
                                        icon={<FileTextOutlined />}
                                        onClick={() => openOffer(`/my-offers/${offer.id}`)}
                                    >
                                        {pending && !expired ? "Xem và phản hồi" : "Xem chi tiết"}
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
