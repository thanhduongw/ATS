import { useEffect, useState } from "react";
import { App, Button, Card, Empty, List, Space, Tag, Typography } from "antd";
import { CheckCircleTwoTone, ClockCircleTwoTone } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppSelector } from "../../../app/hooks";
import { DEPARTMENT_ROLES } from "../../../app/roles";
import { confirmSlot, getMyPendingSlots } from "../schedulingApi";
import type { InterviewSlotResponse } from "../schedulingTypes";
import { useI18n } from "../../../i18n/I18nProvider";

export default function SlotConfirmationPanel() {
    const { message } = App.useApp();
    const { t } = useI18n();
    const user = useAppSelector((s) => s.auth.user);
    const [slots, setSlots] = useState<InterviewSlotResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const isDept = !!user && DEPARTMENT_ROLES.includes(user.role);

    const load = () => {
        setLoading(true);
        getMyPendingSlots().then((r) => setSlots(r.data)).finally(() => setLoading(false));
    };
    useEffect(load, []);

    const handleConfirm = async (id: number, available: boolean) => {
        await confirmSlot(id, { available });
        message.success(available ? t("scheduling.available") : t("scheduling.unavailable"));
        load();
    };

    if (!slots.length) return <Empty description={t("scheduling.waiting")} />;

    return (
        <List grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }} loading={loading}
            dataSource={slots}
            renderItem={(s) => (
                <List.Item>
                    <Card size="small" title={`${s.candidateName}`}
                        extra={s.matched ? <Tag color="green">{t("scheduling.matched")}</Tag>
                            : <Tag color="gold">{t("scheduling.waiting")}</Tag>}>
                        <Typography.Text strong>
                            <ClockCircleTwoTone twoToneColor="#0E7A5F" />{" "}
                            {dayjs(s.startTime).format("HH:mm – ")}{dayjs(s.endTime).format("HH:mm, DD/MM/YYYY")}
                        </Typography.Text>
                        <br />
                        <Tag>{s.format}</Tag>
                        <Space style={{ marginTop: 12 }}>
                            <Button size="small" type="primary" icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                                onClick={() => handleConfirm(s.id, true)}>
                                {isDept ? t("scheduling.available") : t("scheduling.available")}
                            </Button>
                            <Button size="small" danger onClick={() => handleConfirm(s.id, false)}>
                                {t("scheduling.unavailable")}
                            </Button>
                        </Space>
                    </Card>
                </List.Item>
            )}
        />
    );
}