import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App, Button, Card, DatePicker, Form, Input, Modal, Radio, Space, Tag, Typography, Alert, Progress, Tooltip } from "antd";
import {
    PlusOutlined, ThunderboltOutlined, CheckCircleOutlined,
    ClockCircleOutlined, TeamOutlined, UserOutlined, ScheduleOutlined,
    VideoCameraOutlined, EnvironmentOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import { createSlots, getSlots, selectSlot } from "../schedulingApi";
import type { InterviewSlotResponse } from "../schedulingTypes";
import SlotConfirmationPanel from "../components/SlotConfirmationPanel";
import { useI18n } from "../../../i18n/I18nProvider";
import { COLORS, GRADIENTS } from "../../../app/theme";

const { Text } = Typography;

/* ── Slot status helpers ──────────────────────────────── */
function getMatchCount(s: InterviewSlotResponse) {
    return [s.departmentConfirmed, s.candidateConfirmed].filter(Boolean).length;
}

function ConfirmBadge({ confirmed, label }: { confirmed: boolean; label: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {confirmed
                ? <CheckCircleOutlined style={{ color: COLORS.success, fontSize: 16 }} />
                : <ClockCircleOutlined style={{ color: "#F59E0B", fontSize: 16 }} />}
            <span style={{ fontSize: 12, color: confirmed ? COLORS.success : "#F59E0B", fontWeight: 500 }}>
                {label}
            </span>
        </div>
    );
}

/* ── Slot Card ────────────────────────────────────────── */
function SlotCard({ slot, onSelect }: { slot: InterviewSlotResponse; onSelect: (id: number) => void }) {
    const { t } = useI18n();
    const matchCount = getMatchCount(slot);
    const isSelected = slot.status === "SELECTED";
    const isMatched = slot.matched && slot.status !== "SELECTED";

    const borderColor = isSelected ? COLORS.primary : isMatched ? COLORS.success : COLORS.border;
    const bgColor = isSelected ? "#F0FDF4" : isMatched ? "#ECFDF5" : "#FFFFFF";

    return (
        <div style={{
            border: `1px solid ${borderColor}`,
            borderLeft: `4px solid ${borderColor}`,
            borderRadius: 10,
            padding: "16px 20px",
            background: bgColor,
            marginBottom: 10,
            transition: "all 0.2s ease",
        }}>
            {/* Time row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ScheduleOutlined style={{ color: COLORS.primary, fontSize: 16 }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>
                            {dayjs(slot.startTime).format("HH:mm")} – {dayjs(slot.endTime).format("HH:mm")}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                            {dayjs(slot.startTime).format("dddd, DD/MM/YYYY")}
                        </div>
                    </div>
                </div>

                {/* Status tags */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isSelected && <Tag color="blue" style={{ fontWeight: 600 }}>✓ Đã chốt</Tag>}
                    {isMatched && <Tag color="success" style={{ fontWeight: 600 }}>✓ Khớp 3 bên</Tag>}
                    {!isSelected && !isMatched && <Tag color="gold">Chờ xác nhận</Tag>}
                </div>
            </div>

            {/* Format badge */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <Tag
                    icon={slot.format === "ONLINE" ? <VideoCameraOutlined /> : <EnvironmentOutlined />}
                    color={slot.format === "ONLINE" ? "blue" : "cyan"}
                    style={{ fontSize: 12 }}
                >
                    {slot.format === "ONLINE" ? "Online" : "Offline"}
                </Tag>
                {slot.location && <Text type="secondary" style={{ fontSize: 12 }}>{slot.location}</Text>}
                {slot.meetingLink && (
                    <a href={slot.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                        Mở link họp
                    </a>
                )}
            </div>

            {/* 3-party confirmation */}
            <div style={{
                display: "flex", gap: 20, paddingTop: 10,
                borderTop: "1px solid #F3F4F6", alignItems: "center",
            }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <CheckCircleOutlined style={{ color: COLORS.primary }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>HR ✓</Text>
                </div>
                <ConfirmBadge confirmed={slot.departmentConfirmed} label="Phòng ban" />
                <ConfirmBadge confirmed={slot.candidateConfirmed} label="Ứng viên" />

                {/* 3-party progress */}
                <div style={{ flex: 1 }}>
                    <Progress
                        percent={Math.round(((matchCount + 1) / 3) * 100)}
                        size="small"
                        strokeColor={COLORS.primary}
                        showInfo={false}
                        style={{ marginBottom: 0 }}
                    />
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>{matchCount + 1}/3 xác nhận</Text>
            </div>

            {/* Action */}
            {slot.status === "PROPOSED" && (
                <div style={{ marginTop: 12 }}>
                    <Tooltip title={!slot.matched ? "Chưa đủ 3 bên xác nhận. Bạn có thể chốt thủ công." : "Đã khớp 3 bên, chốt lịch ngay!"}>
                        <Button
                            type="primary"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={() => onSelect(slot.id)}
                        >
                            {t("scheduling.selectSlot")}
                        </Button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}

/* ── Main Page ────────────────────────────────────────── */
export default function InterviewSchedulingPage() {
    const { message } = App.useApp();
    const user = useAppSelector((s) => s.auth.user);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const applicationId = Number(params.get("applicationId") ?? 0);
    const isHR = !!user && HR_ROLES.includes(user.role);

    const [slots, setSlots] = useState<InterviewSlotResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(() => {
        if (!applicationId) return;
        setLoading(true);
        getSlots(applicationId).then((r) => setSlots(r.data)).finally(() => setLoading(false));
    }, [applicationId]);
    useEffect(load, [load]);

    const handleCreate = async () => {
        const v = await form.validateFields();
        const payload = {
            applicationId,
            format: v.format,
            location: v.location ?? null,
            meetingLink: v.meetingLink ?? null,
            slots: v.slots.map((s: { range: [Dayjs, Dayjs] }) => ({
                startTime: s.range[0].toISOString(),
                endTime: s.range[1].toISOString(),
            })),
        };
        await createSlots(payload);
        message.success("Đã tạo khung giờ thành công!");
        setOpen(false); form.resetFields();
        load();
    };

    const handleSelect = async (id: number) => {
        await selectSlot(id);
        message.success("✅ Đã chốt lịch phỏng vấn! Hệ thống sẽ gửi thông báo cho các bên.");
        navigate("/interviews");
    };

    /* Non-HR view: only slot confirmation */
    if (!isHR) {
        return (
            <div className="page-container animate-fade-in">
                <div className="page-header" style={{ marginBottom: 20 }}>
                    <div className="page-header-title">
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: GRADIENTS.stat4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20 }}>
                            <ScheduleOutlined />
                        </div>
                        <div>
                            <h2 style={{ margin: 0 }}>Xác nhận khung giờ phỏng vấn</h2>
                            <div className="page-header-subtitle">Xác nhận các khung giờ bạn có thể tham gia</div>
                        </div>
                    </div>
                </div>
                <Card style={{ border: "none" }}>
                    <SlotConfirmationPanel />
                </Card>
            </div>
        );
    }

    const matchedSlots = slots.filter(s => s.matched && s.status !== "SELECTED");
    const selectedSlots = slots.filter(s => s.status === "SELECTED");
    const pendingSlots = slots.filter(s => !s.matched && s.status !== "SELECTED");

    return (
        <div className="page-container animate-fade-in">
            {/* ── Page Header ──────────────────── */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-title">
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: GRADIENTS.stat4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20 }}>
                        <ScheduleOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0 }}>Xếp lịch phỏng vấn (3 bên)</h2>
                        <div className="page-header-subtitle">HR tạo khung giờ → Phòng ban & Ứng viên xác nhận → Hệ thống chốt lịch</div>
                    </div>
                </div>
                <Space>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        disabled={!applicationId}
                        onClick={() => setOpen(true)}
                    >
                        Tạo khung giờ
                    </Button>
                    <Button
                        size="large"
                        onClick={() => navigate(`/interviews${applicationId ? `?applicationId=${applicationId}` : ""}`)}
                    >
                        Tạo lịch thủ công
                    </Button>
                </Space>
            </div>

            {!applicationId && (
                <Alert
                    type="info"
                    showIcon
                    message='Mở trang này từ trang "Hồ sơ ứng tuyển" hoặc thêm ?applicationId=… vào URL'
                    style={{ marginBottom: 20, borderRadius: 10 }}
                />
            )}

            {/* ── How it works ─────────────────── */}
            <Card style={{ marginBottom: 16, border: "none", background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)" }}>
                <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                    {[
                        { step: 1, icon: <UserOutlined />, label: "HR tạo khung giờ", color: COLORS.primary },
                        { step: 2, icon: <TeamOutlined />, label: "Phòng ban xác nhận", color: "#3B82F6" },
                        { step: 3, icon: <UserOutlined />, label: "Ứng viên xác nhận", color: "#8B5CF6" },
                        { step: 4, icon: <ThunderboltOutlined />, label: "Hệ thống chốt lịch", color: "#F59E0B" },
                    ].map((s, idx) => (
                        <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${s.color}15`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: s.color, fontWeight: 700, fontSize: 16,
                            }}>
                                {s.step}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>{s.label}</span>
                            {idx < 3 && <span style={{ color: COLORS.textMuted, fontSize: 18 }}>→</span>}
                        </div>
                    ))}
                </div>
            </Card>

            {/* ── Slot lists ───────────────────── */}
            {selectedSlots.length > 0 && (
                <Card
                    title={<><CheckCircleOutlined style={{ color: COLORS.success, marginRight: 8 }} />Lịch đã chốt</>}
                    style={{ marginBottom: 16, border: `1px solid ${COLORS.success}30` }}
                >
                    {selectedSlots.map(s => <SlotCard key={s.id} slot={s} onSelect={handleSelect} />)}
                </Card>
            )}

            {matchedSlots.length > 0 && (
                <Card
                    title={<><ThunderboltOutlined style={{ color: COLORS.success, marginRight: 8 }} />Khớp 3 bên — sẵn sàng chốt</>}
                    style={{ marginBottom: 16, border: `1px solid ${COLORS.success}50` }}
                >
                    {matchedSlots.map(s => <SlotCard key={s.id} slot={s} onSelect={handleSelect} />)}
                </Card>
            )}

            <Card
                title={<><ClockCircleOutlined style={{ color: "#F59E0B", marginRight: 8 }} />Các khung giờ đề xuất ({slots.length})</>}
                loading={loading}
                style={{ border: "none" }}
            >
                {slots.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: COLORS.textMuted }}>
                        <ScheduleOutlined style={{ fontSize: 32, marginBottom: 12 }} />
                        <div>Chưa có khung giờ nào. Nhấn "Tạo khung giờ" để bắt đầu.</div>
                    </div>
                ) : (
                    pendingSlots.map(s => <SlotCard key={s.id} slot={s} onSelect={handleSelect} />)
                )}
            </Card>

            {/* ── Create Slot Modal ─────────────── */}
            <Modal
                open={open}
                title={<><PlusOutlined style={{ marginRight: 8, color: COLORS.primary }} />Tạo khung giờ phỏng vấn</>}
                onOk={handleCreate}
                onCancel={() => { setOpen(false); form.resetFields(); }}
                okText="Tạo khung giờ"
                cancelText="Hủy"
                width={640}
            >
                <Form form={form} layout="vertical" initialValues={{ format: "OFFLINE", slots: [{}] }} style={{ marginTop: 16 }}>
                    <Form.Item name="format" label="Hình thức phỏng vấn" rules={[{ required: true }]}>
                        <Radio.Group>
                            <Radio.Button value="ONLINE"><VideoCameraOutlined style={{ marginRight: 6 }} />Online</Radio.Button>
                            <Radio.Button value="OFFLINE"><EnvironmentOutlined style={{ marginRight: 6 }} />Offline (Tại văn phòng)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => getFieldValue("format") === "ONLINE" ? (
                            <Form.Item name="meetingLink" label="Link họp trực tuyến">
                                <Input prefix={<VideoCameraOutlined style={{ color: "#9CA3AF" }} />} placeholder="https://meet.google.com/..." size="large" />
                            </Form.Item>
                        ) : (
                            <Form.Item name="location" label="Địa điểm">
                                <Input prefix={<EnvironmentOutlined style={{ color: "#9CA3AF" }} />} placeholder="Phòng họp A, Tầng 3, 12 Nguyễn Văn Bảo..." size="large" />
                            </Form.Item>
                        )}
                    </Form.Item>

                    <Form.List name="slots">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map((f) => (
                                    <div key={f.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                        <Form.Item
                                            label={`Khung giờ ${f.name + 1}`}
                                            name={[f.name, "range"]}
                                            rules={[{ required: true, message: "Vui lòng chọn khung giờ" }]}
                                            style={{ flex: 1 }}
                                        >
                                            <DatePicker.RangePicker showTime format="HH:mm DD/MM/YYYY" style={{ width: "100%" }} size="large" />
                                        </Form.Item>
                                        {fields.length > 1 && (
                                            <Button danger size="small" onClick={() => remove(f.name)} style={{ marginTop: 30 }}>✕</Button>
                                        )}
                                    </div>
                                ))}
                                <Button type="dashed" block onClick={() => add()} icon={<PlusOutlined />}>
                                    Thêm khung giờ
                                </Button>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </div>
    );
}