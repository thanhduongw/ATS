import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    Card,
    Button,
    Row,
    Col,
    Modal,
    Select,
    Input,
    Result,
    Spin,
    Tag,
    Typography,
    message,
    App,
} from "antd";
import {
    CheckCircleFilled,
    CloseCircleFilled,
    GiftOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import {
    getOfferById,
    acceptOffer,
    declineOffer,
} from "../offerCandidateApi";
import type { ApiMessageResponse, OfferResponse } from "../types";
import { COLORS, GRADIENTS } from "../../../app/theme";

const { Title, Text, Paragraph } = Typography;

export default function OfferCandidateViewPage() {
    const { id } = useParams();
    const { message: msg } = App.useApp();

    const [offer, setOffer] = useState<OfferResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState<number>(1);
    const [note, setNote] = useState("");
    const [timeLeft, setTimeLeft] = useState("");

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setForbidden(false);
        setNotFound(false);
        try {
            const r = await getOfferById(Number(id));
            setOffer(r.data);
            if (r.data.status === "ACCEPTED") setAccepted(true);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            if (e.response?.status === 403) setForbidden(true);
            else if (e.response?.status === 404) setNotFound(true);
            else msg.error(e.response?.data?.message ?? "Không tải được Offer");
        } finally {
            setLoading(false);
        }
    }, [id, msg]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!offer?.responseDeadline) return;
        const update = () => {
            const diff = dayjs(offer.responseDeadline).valueOf() - Date.now();
            if (diff <= 0) {
                setTimeLeft("Đã hết hạn");
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(
                `${d > 0 ? d + " ngày " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            );
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [offer?.responseDeadline]);

    const handleAccept = async () => {
        if (!offer) return;
        try {
            await acceptOffer(offer.id);
            message.success("Chúc mừng! Bạn đã chấp nhận offer.");
            setAccepted(true);
            load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không thể chấp nhận offer");
        }
    };

    const handleDecline = async () => {
        if (!offer) return;
        try {
            await declineOffer(offer.id, {
                declineReasonId: declineReason,
                note: note || null,
            });
            setDeclineOpen(false);
            message.info("Bạn đã từ chối offer.");
            load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không thể từ chối offer");
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (forbidden) {
        return (
            <Result
                status="403"
                title="Không có quyền"
                subTitle="Đây không phải Offer của bạn."
            />
        );
    }

    if (notFound || !offer) {
        return (
            <Result
                status="404"
                title="Không tìm thấy"
                subTitle="Offer không tồn tại hoặc đã bị xóa."
            />
        );
    }

    const pending = offer.status === "APPROVED";
    const expired =
        offer.responseDeadline != null &&
        dayjs(offer.responseDeadline).isBefore(dayjs());

    return (
        <div className="page-container animate-fade-in">
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <Card
                    style={{
                        borderRadius: 16,
                        border: "none",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
                    }}
                >
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 16,
                                background: GRADIENTS.stat3,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 28,
                                marginBottom: 12,
                            }}
                        >
                            <GiftOutlined />
                        </div>
                        <Title level={3} style={{ marginBottom: 4 }}>
                            Thư đề nghị nhận việc
                        </Title>
                        <Text type="secondary">Xin chào, {offer.candidateName}</Text>
                        <div style={{ marginTop: 8 }}>
                            <Tag color={STATUS_COLOR_SAFE(offer.status)}>
                                {STATUS_LABEL_SAFE(offer.status)}
                            </Tag>
                        </div>
                    </div>

                    <Card
                        type="inner"
                        title="Chi tiết đề nghị"
                        style={{ marginBottom: 20, borderRadius: 12 }}
                    >
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Text type="secondary">Mức lương</Text>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}>
                                    {Number(offer.salaryOffered).toLocaleString("vi-VN")} đ
                                </div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Loại hợp đồng</Text>
                                <div style={{ fontWeight: 600 }}>{offer.contractTypeName}</div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Ngày bắt đầu</Text>
                                <div style={{ fontWeight: 600 }}>
                                    {dayjs(offer.startDate).format("DD/MM/YYYY")}
                                </div>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Thử việc</Text>
                                <div style={{ fontWeight: 600 }}>
                                    {offer.probationMonths} tháng
                                </div>
                            </Col>
                            {offer.allowance != null && (
                                <Col span={12}>
                                    <Text type="secondary">Phụ cấp</Text>
                                    <div style={{ fontWeight: 600 }}>
                                        {Number(offer.allowance).toLocaleString("vi-VN")} đ
                                    </div>
                                </Col>
                            )}
                            {offer.benefits && (
                                <Col span={24}>
                                    <Text type="secondary">Phúc lợi</Text>
                                    <Paragraph style={{ marginBottom: 0 }}>
                                        {offer.benefits}
                                    </Paragraph>
                                </Col>
                            )}
                            {offer.note && (
                                <Col span={24}>
                                    <Text type="secondary">Ghi chú</Text>
                                    <Paragraph style={{ marginBottom: 0 }}>{offer.note}</Paragraph>
                                </Col>
                            )}
                        </Row>
                    </Card>

                    {offer.responseDeadline && pending && (
                        <AlertCountdown timeLeft={timeLeft} expired={expired} />
                    )}

                    {accepted || offer.status === "ACCEPTED" ? (
                        <Result
                            status="success"
                            title="Bạn đã chấp nhận Offer"
                            subTitle="HR sẽ liên hệ các bước tiếp theo."
                        />
                    ) : offer.status === "DECLINED" ? (
                        <Result
                            status="info"
                            title="Bạn đã từ chối Offer"
                            subTitle={offer.declineReasonName ?? ""}
                        />
                    ) : pending && !expired ? (
                        <Row gutter={16} justify="center">
                            <Col>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<CheckCircleFilled />}
                                    onClick={handleAccept}
                                    style={{
                                        height: 52,
                                        paddingInline: 32,
                                        fontWeight: 600,
                                        fontSize: 15,
                                    }}
                                >
                                    Chấp nhận
                                </Button>
                            </Col>
                            <Col>
                                <Button
                                    size="large"
                                    danger
                                    icon={<CloseCircleFilled />}
                                    onClick={() => setDeclineOpen(true)}
                                    style={{
                                        height: 52,
                                        paddingInline: 32,
                                        fontWeight: 600,
                                        fontSize: 15,
                                    }}
                                >
                                    Từ chối
                                </Button>
                            </Col>
                        </Row>
                    ) : pending && expired ? (
                        <Result status="warning" title="Offer đã hết hạn phản hồi" />
                    ) : (
                        <Result
                            status="info"
                            title="Offer chưa sẵn sàng"
                            subTitle="Vui lòng đợi HR/Phòng ban hoàn tất phê duyệt."
                        />
                    )}
                </Card>
            </div>

            <Modal
                open={declineOpen}
                title={
                    <>
                        <CloseCircleFilled style={{ color: "#EF4444", marginRight: 8 }} />
                        Từ chối Offer
                    </>
                }
                okText="Xác nhận từ chối"
                okButtonProps={{ danger: true }}
                cancelText="Hủy"
                onOk={handleDecline}
                onCancel={() => setDeclineOpen(false)}
                width={440}
            >
                <div style={{ paddingTop: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                            Lý do từ chối
                        </div>
                        <Select
                            style={{ width: "100%" }}
                            size="large"
                            value={declineReason}
                            onChange={setDeclineReason}
                            options={[
                                { value: 1, label: "Không phù hợp mức lương" },
                                { value: 2, label: "Không phù hợp thời gian bắt đầu" },
                                { value: 3, label: "Đã nhận offer từ công ty khác" },
                                { value: 4, label: "Lý do cá nhân" },
                            ]}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                            Ghi chú thêm (tùy chọn)
                        </div>
                        <Input.TextArea
                            rows={3}
                            placeholder="Nhập ghi chú..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function STATUS_LABEL_SAFE(s: string) {
    const m: Record<string, string> = {
        DRAFT: "Nháp",
        PENDING_APPROVAL: "Chờ duyệt",
        APPROVED: "Chờ bạn phản hồi",
        REJECTED: "Đã bị từ chối nội bộ",
        ACCEPTED: "Đã chấp nhận",
        DECLINED: "Đã từ chối",
    };
    return m[s] ?? s;
}

function STATUS_COLOR_SAFE(s: string) {
    const m: Record<string, string> = {
        APPROVED: "blue",
        ACCEPTED: "green",
        DECLINED: "magenta",
        PENDING_APPROVAL: "gold",
        REJECTED: "red",
        DRAFT: "default",
    };
    return m[s] ?? "default";
}

function AlertCountdown({
    timeLeft,
    expired,
}: {
    timeLeft: string;
    expired: boolean;
}) {
    return (
        <div
            style={{
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: 10,
                background: expired ? "#FEF2F2" : "#EFF6FF",
                border: `1px solid ${expired ? "#FECACA" : "#BFDBFE"}`,
                textAlign: "center",
            }}
        >
            <Text type="secondary">Thời hạn phản hồi còn lại</Text>
            <div
                style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: expired ? COLORS.error : COLORS.info,
                }}
            >
                {timeLeft}
            </div>
        </div>
    );
}