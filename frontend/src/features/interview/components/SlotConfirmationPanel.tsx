import { useEffect, useMemo, useState } from "react";
import { App, Badge, Button, Card, Empty, Popconfirm, Skeleton, Space, Tag, Typography } from "antd";
import {
    CheckCircleFilled, CloseCircleOutlined, ClockCircleOutlined,
    EnvironmentOutlined, VideoCameraOutlined, UserOutlined, CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { confirmSlot, getMyPendingSlots } from "../schedulingApi";
import type { InterviewSlotResponse } from "../schedulingTypes";
import { useI18n } from "../../../i18n/useI18n";
import { COLORS, GRADIENTS } from "../../../app/theme";

const { Text } = Typography;

const VI_WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function formatDateHeading(iso: string) {
    const d = dayjs(iso);
    return `${VI_WEEKDAYS[d.day()]}, ${d.format("DD/MM/YYYY")}`;
}

function SlotItem({ slot, onConfirm, busy, t }: {
    slot: InterviewSlotResponse;
    onConfirm: (id: number, available: boolean) => void;
    busy: boolean;
    t: (key: string) => string;
}) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "16px 18px", borderRadius: 12,
            border: `1px solid ${slot.matched ? `${COLORS.success}40` : COLORS.border}`,
            background: slot.matched ? "#ECFDF5" : "#FFFFFF",
        }}>
            {/* Time block */}
            <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                width: 88, flexShrink: 0, padding: "10px 0", borderRadius: 10,
                background: GRADIENTS.stat4, color: "#fff",
            }}>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{dayjs(slot.startTime).format("HH:mm")}</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>đến {dayjs(slot.endTime).format("HH:mm")}</div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
                        <UserOutlined style={{ color: COLORS.textMuted }} /> {slot.candidateName}
                    </span>
                    {slot.matched
                        ? <Tag color="success" style={{ borderRadius: 6, margin: 0 }}>Khớp 3 bên</Tag>
                        : <Tag color="gold" style={{ borderRadius: 6, margin: 0 }}>{t("scheduling.waiting")}</Tag>}
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: COLORS.textSecondary }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {slot.format === "ONLINE" ? <VideoCameraOutlined /> : <EnvironmentOutlined />}
                        {slot.format === "ONLINE" ? "Phỏng vấn online" : "Phỏng vấn tại văn phòng"}
                    </span>
                    {slot.format === "ONLINE" && slot.meetingLink ? (
                        <a href={slot.meetingLink} target="_blank" rel="noopener noreferrer">Link họp</a>
                    ) : slot.location ? (
                        <span>{slot.location}</span>
                    ) : null}
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {slot.candidateConfirmed
                            ? <><CheckCircleFilled style={{ color: COLORS.success }} /> Ứng viên đã xác nhận</>
                            : <><ClockCircleOutlined style={{ color: COLORS.textMuted }} /> Ứng viên chưa xác nhận</>}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <Space size={8}>
                <Button type="primary" icon={<CheckCircleFilled />} loading={busy} onClick={() => onConfirm(slot.id, true)}>
                    {t("scheduling.available")}
                </Button>
                <Popconfirm
                    title="Báo không thể tham gia khung giờ này?"
                    description="HR sẽ cần đề xuất khung giờ khác cho bạn."
                    okText="Xác nhận"
                    cancelText="Đóng"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onConfirm(slot.id, false)}
                >
                    <Button danger icon={<CloseCircleOutlined />} loading={busy}>
                        {t("scheduling.unavailable")}
                    </Button>
                </Popconfirm>
            </Space>
        </div>
    );
}

export default function SlotConfirmationPanel() {
    const { message } = App.useApp();
    const { t } = useI18n();
    const [slots, setSlots] = useState<InterviewSlotResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);

    const load = () => {
        setLoading(true);
        getMyPendingSlots().then((r) => setSlots(r.data)).finally(() => setLoading(false));
    };
    useEffect(load, []);

    const handleConfirm = async (id: number, available: boolean) => {
        setConfirmingId(id);
        try {
            await confirmSlot(id, { available });
            message.success(available ? "Đã xác nhận bạn có thể tham gia khung giờ này" : "Đã báo không thể tham gia khung giờ này");
            load();
        } finally {
            setConfirmingId(null);
        }
    };

    const groups = useMemo(() => {
        const map = new Map<string, InterviewSlotResponse[]>();
        for (const s of slots) {
            const key = dayjs(s.startTime).format("YYYY-MM-DD");
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(s);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [slots]);

    if (loading && slots.length === 0) {
        return (
            <Card style={{ border: "none" }}>
                <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
        );
    }

    if (!loading && slots.length === 0) {
        return (
            <Card style={{ border: "none", padding: "20px 0" }}>
                <Empty
                    image={<CalendarOutlined style={{ fontSize: 40, color: COLORS.textMuted }} />}
                    description={
                        <div>
                            <div style={{ fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>
                                Không có khung giờ nào cần xác nhận
                            </div>
                            <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                                Khi HR đề xuất lịch phỏng vấn mới cho bạn, chúng sẽ xuất hiện ở đây.
                            </div>
                        </div>
                    }
                />
            </Card>
        );
    }

    return (
        <div>
            <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
                padding: "14px 18px", borderRadius: 12, background: GRADIENTS.card, border: `1px solid ${COLORS.success}30`,
            }}>
                <Badge count={slots.length} color={COLORS.warning} />
                <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>
                    Bạn có <strong>{slots.length}</strong> khung giờ phỏng vấn đang chờ xác nhận
                </Text>
            </div>

            {groups.map(([dateKey, daySlots]) => (
                <div key={dateKey} style={{ marginBottom: 20 }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                        fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.3,
                    }}>
                        <CalendarOutlined /> {formatDateHeading(daySlots[0].startTime)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {daySlots.map((s) => (
                            <SlotItem key={s.id} slot={s} onConfirm={handleConfirm} busy={confirmingId === s.id} t={t} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
