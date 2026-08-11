import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { App, Button, Card, Col, Descriptions, Input, Modal, Row, Select, Tag, Divider } from "antd";
import {
    CheckCircleFilled, CloseCircleFilled, CalendarOutlined,
    DollarOutlined, FileTextOutlined, ClockCircleOutlined, GiftOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { acceptOffer, declineOffer, getOfferById } from "../offerCandidateApi";
import type { OfferResponse } from "../types";
import { COLORS, GRADIENTS } from "../../../app/theme";

export default function OfferCandidateViewPage() {
    const { id } = useParams();
    const { message } = App.useApp();
    const [offer, setOffer] = useState<OfferResponse | null>(null);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState<number>(1);
    const [note, setNote] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>("");

    const load = () => getOfferById(Number(id)).then((r) => setOffer(r.data));
    useEffect(() => { load(); }, [id]);

    /* Countdown timer */
    useEffect(() => {
        if (!offer?.responseDeadline) return;
        const update = () => {
            const diff = dayjs(offer.responseDeadline).valueOf() - Date.now();
            if (diff <= 0) { setTimeLeft("Đã hết hạn"); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${d > 0 ? d + " ngày " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [offer?.responseDeadline]);

    const handleAccept = async () => {
        await acceptOffer(offer!.id);
        message.success("🎉 Chúc mừng! Bạn đã chấp nhận offer!");
        setAccepted(true);
        load();
    };

    const handleDecline = async () => {
        await declineOffer(offer!.id, { declineReasonId: declineReason, note });
        setDeclineOpen(false);
        message.info("Bạn đã từ chối offer.");
        load();
    };

    if (!offer) return null;

    const pending = offer.status === "APPROVED";

    return (
        <div style={{ minHeight: "100vh", background: "#F0F2F5", padding: "40px 16px" }}>
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
                {/* ── Company Header ──────────────── */}
                <div style={{
                    background: GRADIENTS.header,
                    borderRadius: "16px 16px 0 0", padding: "32px 40px",
                    textAlign: "center", position: "relative", overflow: "hidden",
                }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(217,249,157,0.1)" }} />
                    <div style={{ position: "absolute", bottom: -40, left: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(16,185,129,0.08)" }} />
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 3, color: "#D9F99D", marginBottom: 8 }}>ATS</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                            Thư Đề Nghị Tuyển Dụng
                        </div>
                        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                            Gửi đến: <strong style={{ color: "#fff" }}>{offer.candidateName}</strong>
                        </div>
                    </div>
                </div>

                {/* ── Status Banner ────────────────── */}
                {offer.status !== "APPROVED" && (
                    <div style={{
                        padding: "16px 24px", textAlign: "center",
                        background: offer.status === "ACCEPTED" ? "#F0FDF4" : offer.status === "DECLINED" ? "#FEF2F2" : "#FFFBEB",
                        border: `1px solid ${offer.status === "ACCEPTED" ? "#BBF7D0" : offer.status === "DECLINED" ? "#FECACA" : "#FDE68A"}`,
                    }}>
                        {offer.status === "ACCEPTED" && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <CheckCircleFilled style={{ color: "#22C55E", fontSize: 20 }} />
                                <span style={{ fontWeight: 600, color: "#166534", fontSize: 15 }}>Bạn đã chấp nhận offer này! 🎉</span>
                            </div>
                        )}
                        {offer.status === "DECLINED" && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <CloseCircleFilled style={{ color: "#EF4444", fontSize: 20 }} />
                                <span style={{ fontWeight: 600, color: "#991B1B", fontSize: 15 }}>Bạn đã từ chối offer này.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Offer Detail Card ─────────────── */}
                <Card style={{ borderRadius: "0 0 16px 16px", border: "1px solid #E5E7EB", borderTop: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }}>
                    {/* Salary highlight */}
                    <div style={{
                        background: GRADIENTS.card,
                        border: "1px solid #BBF7D0",
                        borderRadius: 12, padding: "20px 24px", marginBottom: 24,
                        textAlign: "center",
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                            <DollarOutlined style={{ marginRight: 6 }} />Mức lương đề nghị
                        </div>
                        <div style={{ fontSize: 38, fontWeight: 800, color: COLORS.primary, lineHeight: 1 }}>
                            {offer.salaryOffered.toLocaleString("vi-VN")}
                        </div>
                        <div style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 4 }}>VND / tháng</div>
                        {offer.allowance && (
                            <div style={{ marginTop: 8, fontSize: 14, color: COLORS.textSecondary }}>
                                + Phụ cấp: <strong style={{ color: COLORS.primaryLight }}>{offer.allowance.toLocaleString("vi-VN")} VND</strong>
                            </div>
                        )}
                    </div>

                    {/* Offer details */}
                    <Descriptions column={1} labelStyle={{ fontWeight: 600, color: COLORS.textSecondary, width: 160 }} bordered size="small">
                        <Descriptions.Item label={<><FileTextOutlined style={{ marginRight: 6 }} />Loại hợp đồng</>}>
                            <Tag color="blue">{offer.contractTypeName}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label={<><CalendarOutlined style={{ marginRight: 6 }} />Ngày bắt đầu</>}>
                            <strong>{dayjs(offer.startDate).format("DD/MM/YYYY")}</strong>
                        </Descriptions.Item>
                        {offer.probationMonths !== null && (
                            <Descriptions.Item label={<><ClockCircleOutlined style={{ marginRight: 6 }} />Thời gian thử việc</>}>
                                {offer.probationMonths} tháng
                            </Descriptions.Item>
                        )}
                        {offer.benefits && (
                            <Descriptions.Item label={<><GiftOutlined style={{ marginRight: 6 }} />Phúc lợi & Đãi ngộ</>}>
                                {offer.benefits}
                            </Descriptions.Item>
                        )}
                        {offer.note && (
                            <Descriptions.Item label="Ghi chú">
                                {offer.note}
                            </Descriptions.Item>
                        )}
                    </Descriptions>

                    {/* Deadline countdown */}
                    {pending && offer.responseDeadline && (
                        <div style={{ textAlign: "center", margin: "24px 0 16px" }}>
                            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>
                                <ClockCircleOutlined style={{ marginRight: 6 }} />
                                Vui lòng phản hồi trước:
                            </div>
                            <div style={{ fontSize: 22, color: COLORS.warning, fontWeight: 700, letterSpacing: 1 }}>
                                {timeLeft || dayjs(offer.responseDeadline).format("HH:mm DD/MM/YYYY")}
                            </div>
                            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                                Hạn chót: {dayjs(offer.responseDeadline).format("DD/MM/YYYY HH:mm")}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {pending && (
                        <>
                            <Divider />
                            {accepted ? (
                                <div style={{ textAlign: "center", padding: "16px 0" }}>
                                    <CheckCircleFilled style={{ fontSize: 48, color: "#22C55E", marginBottom: 12, display: "block" }} />
                                    <div style={{ fontWeight: 600, fontSize: 16, color: "#166534" }}>Offer đã được chấp nhận! 🎉</div>
                                    <div style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>Chúng tôi sẽ liên hệ với bạn sớm.</div>
                                </div>
                            ) : (
                                <Row gutter={16} justify="center">
                                    <Col>
                                        <Button
                                            type="primary"
                                            size="large"
                                            icon={<CheckCircleFilled />}
                                            onClick={handleAccept}
                                            style={{ height: 52, paddingInline: 32, fontWeight: 600, fontSize: 15 }}
                                        >
                                            Đồng ý nhận việc
                                        </Button>
                                    </Col>
                                    <Col>
                                        <Button
                                            danger
                                            size="large"
                                            icon={<CloseCircleFilled />}
                                            onClick={() => setDeclineOpen(true)}
                                            style={{ height: 52, paddingInline: 32, fontWeight: 600, fontSize: 15 }}
                                        >
                                            Từ chối
                                        </Button>
                                    </Col>
                                </Row>
                            )}
                        </>
                    )}
                </Card>
            </div>

            {/* Decline Modal */}
            <Modal
                open={declineOpen}
                title={<><CloseCircleFilled style={{ color: "#EF4444", marginRight: 8 }} />Từ chối Offer</>}
                okText="Xác nhận từ chối"
                okButtonProps={{ danger: true }}
                cancelText="Hủy"
                onOk={handleDecline}
                onCancel={() => setDeclineOpen(false)}
                width={440}
            >
                <div style={{ paddingTop: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Lý do từ chối</div>
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
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ghi chú thêm (tùy chọn)</div>
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