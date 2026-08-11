import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App, Button, Card, DatePicker, Form, Input, Modal, Radio, Space, Table, Tag, Typography } from "antd";
import { PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import { createSlots, getSlots, selectSlot } from "../schedulingApi";
import type { InterviewSlotResponse } from "../schedulingTypes";
import SlotConfirmationPanel from "../components/SlotConfirmationPanel";
import { useI18n } from "../../../i18n/I18nProvider";

const { Title } = Typography;

export default function InterviewSchedulingPage() {
    const { message } = App.useApp();
    const { t } = useI18n();
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
        message.success("OK");
        setOpen(false); form.resetFields();
        load();
    };

    const handleSelect = async (id: number) => {
        await selectSlot(id);              // backend tự tạo Interview
        message.success(t("scheduling.selected"));
        navigate("/interviews");
    };

    if (!isHR) {   // Phòng ban / Ứng viên / Interviewer → chỉ xác nhận khung giờ
        return (<Card title={t("scheduling.title")}><SlotConfirmationPanel /></Card>);
    }

    const columns = [
        {
            title: t("scheduling.slotTime"), key: "time",
            render: (_: unknown, s: InterviewSlotResponse) =>
                `${dayjs(s.startTime).format("HH:mm DD/MM")} → ${dayjs(s.endTime).format("HH:mm")}`
        },
        { title: "Format", dataIndex: "format" },
        {
            title: t("scheduling.department"), dataIndex: "departmentConfirmed",
            render: (v: boolean) => v ? <Tag color="green">✓</Tag> : <Tag color="gold">…</Tag>
        },
        {
            title: t("scheduling.candidate"), dataIndex: "candidateConfirmed",
            render: (v: boolean) => v ? <Tag color="green">✓</Tag> : <Tag color="gold">…</Tag>
        },
        {
            title: "Status", key: "st", render: (_: unknown, s: InterviewSlotResponse) =>
                s.status === "SELECTED" ? <Tag color="blue">{t("scheduling.selected")}</Tag>
                    : s.matched ? <Tag color="green">{t("scheduling.matched")}</Tag>
                        : <Tag color="gold">{t("scheduling.waiting")}</Tag>
        },
        {
            title: "", key: "act", render: (_: unknown, s: InterviewSlotResponse) =>
                s.status === "PROPOSED" && (
                    <Button size="small" type="primary" icon={<ThunderboltOutlined />}
                        onClick={() => handleSelect(s.id)}>
                        {t("scheduling.selectSlot")}
                    </Button>
                )
        },
    ];

    return (
        <Card title={t("scheduling.title")} extra={
            <Space>
                <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpen(true)}>
                    {t("scheduling.createSlots")}
                </Button>
                <Button onClick={() => navigate(`/interviews?applicationId=${applicationId}`)}>
                    {t("scheduling.manual")}
                </Button>
            </Space>}>
            {!applicationId && <Title level={5}>Mở từ trang Ứng viên / Interviews (kèm ?applicationId=…)</Title>}
            <Table rowKey="id" loading={loading} dataSource={slots} columns={columns} pagination={false} />

            <Modal open={open} title={t("scheduling.createSlots")} onOk={handleCreate} okText="Save" width={640}>
                <Form form={form} layout="vertical" initialValues={{ format: "OFFLINE", slots: [{}] }}>
                    <Form.Item name="format" label="Format" rules={[{ required: true }]}>
                        <Radio.Group options={["ONLINE", "OFFLINE"]} />
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => getFieldValue("format") === "ONLINE" ? (
                            <Form.Item name="meetingLink" label="Meeting link"><Input placeholder="https://…" /></Form.Item>
                        ) : (
                            <Form.Item name="location" label="Location"><Input /></Form.Item>
                        )}
                    </Form.Item>
                    <Form.List name="slots">
                        {(fields, { add, remove }) => (<>
                            {fields.map((f) => (
                                <Form.Item key={f.key} label={t("scheduling.slotTime")} required>
                                    <Space>
                                        <Form.Item name={[f.name, "range"]} noStyle
                                            rules={[{ required: true, message: "required" }]}>
                                            <DatePicker.RangePicker showTime format="HH:mm DD/MM/YYYY" />
                                        </Form.Item>
                                        {fields.length > 1 && <Button danger size="small" onClick={() => remove(f.name)}>X</Button>}
                                    </Space>
                                </Form.Item>
                            ))}
                            <Button onClick={() => add()}>+ {t("scheduling.createSlots")}</Button>
                        </>)}
                    </Form.List>
                </Form>
            </Modal>
        </Card>
    );
}