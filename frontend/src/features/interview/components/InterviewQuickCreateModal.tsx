import { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Button,
    Form,
    Select,
    DatePicker,
    InputNumber,
    Input,
    Radio,
    Alert,
    Space,
    App,
} from "antd";
import {
    CalendarOutlined,
    ClockCircleOutlined,
    UserOutlined,
    TeamOutlined,
    VideoCameraOutlined,
    EnvironmentOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { AxiosError } from "axios";

import { createInterview, getInterviews } from "../interviewApi";
import { getApplications } from "../../candidate/applicationApi";
import { getUserDirectory } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { ApplicationResponse } from "../../candidate/types";
import type { UserDirectoryResponse } from "../../auth/types";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, InterviewFormat, InterviewResponse } from "../types";
import { isSchedulable, applicationOptionLabel } from "../scheduleEligibility";
import { findInterviewerConflicts, describeConflict } from "../conflicts";
import { toLocalDateTimeString } from "../../../app/datetime";
import { COLORS, RADIUS } from "../../../app/theme";

interface Props {
    open: boolean;
    /** Giờ bắt đầu điền sẵn khi mở từ ô trống trên lịch. */
    defaultStart?: Dayjs | null;
    /** Khoá sẵn 1 hồ sơ (khi mở từ trang chi tiết hồ sơ). */
    lockedApplicationId?: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function InterviewQuickCreateModal({
    open,
    defaultStart,
    lockedApplicationId,
    onClose,
    onSuccess,
}: Props) {
    const { message } = App.useApp();

    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [interviewers, setInterviewers] = useState<UserDirectoryResponse[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [existingInterviews, setExistingInterviews] = useState<InterviewResponse[]>([]);

    const [applicationId, setApplicationId] = useState<number | undefined>(undefined);
    const [start, setStart] = useState<Dayjs | null>(null);
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [interviewerIds, setInterviewerIds] = useState<number[]>([]);
    const [format, setFormat] = useState<InterviewFormat>("OFFLINE");
    const [workLocationId, setWorkLocationId] = useState<number | undefined>(undefined);
    const [meetingLink, setMeetingLink] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;

        setApplicationId(lockedApplicationId ?? undefined);
        setStart(defaultStart ?? null);
        setDurationMinutes(60);
        setInterviewerIds([]);
        setFormat("OFFLINE");
        setWorkLocationId(undefined);
        setMeetingLink("");
        setNote("");

        getApplications({ size: 200 }).then((r) => setApplications(r.data.content));
        getUserDirectory("HIRING_MANAGER").then((r) => setInterviewers(r.data));
        getCatalogItems("/masterdata/work-locations").then((r) => setWorkLocations(r.data));
        getInterviews().then((r) => setExistingInterviews(r.data)).catch(() => setExistingInterviews([]));
    }, [open, defaultStart, lockedApplicationId]);

    const schedulableApplications = useMemo(
        () => applications.filter(isSchedulable),
        [applications],
    );

    const conflicts = useMemo(
        () => findInterviewerConflicts(existingInterviews, interviewerIds, start, durationMinutes),
        [existingInterviews, interviewerIds, start, durationMinutes],
    );

    const canSubmit =
        !!applicationId &&
        !!start &&
        durationMinutes > 0 &&
        interviewerIds.length > 0 &&
        (format === "ONLINE" ? meetingLink.trim().length > 0 : !!workLocationId);

    const handleSubmit = async () => {
        if (!canSubmit || !start || !applicationId) return;
        setSaving(true);
        try {
            await createInterview({
                applicationId,
                scheduledAt: toLocalDateTimeString(start),
                durationMinutes,
                format,
                workLocationId: format === "OFFLINE" ? workLocationId : null,
                meetingLink: format === "ONLINE" ? meetingLink : null,
                note: note || null,
                interviewerIds,
            });
            message.success("Đã lên lịch phỏng vấn");
            onSuccess();
            onClose();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Lên lịch thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={620}
            destroyOnHidden
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 8 }}>
                    <span
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${COLORS.primary}12`,
                            color: COLORS.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                            flexShrink: 0,
                        }}
                    >
                        <CalendarOutlined />
                    </span>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
                            Lên lịch phỏng vấn
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                            {start
                                ? `${start.format("HH:mm")} · ${start.format("dddd, DD/MM/YYYY")}`
                                : "Chọn ứng viên và khung giờ phỏng vấn"}
                        </div>
                    </div>
                </div>
            }
            styles={{ footer: { borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 12 } }}
            footer={[
                <Button key="cancel" onClick={onClose} disabled={saving}>
                    Hủy
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    icon={<CalendarOutlined />}
                    loading={saving}
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                >
                    Lên lịch
                </Button>,
            ]}
        >
            <Form layout="vertical" style={{ marginTop: 12 }}>
                <Form.Item label={<Space size={6}><UserOutlined />Ứng viên</Space>} required>
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn hồ sơ ứng tuyển"
                        disabled={!!lockedApplicationId}
                        value={applicationId}
                        onChange={setApplicationId}
                        options={schedulableApplications.map((a) => ({
                            value: a.id,
                            label: applicationOptionLabel(a),
                        }))}
                        notFoundContent="Không có hồ sơ nào đã qua Sàng lọc CV"
                    />
                </Form.Item>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                    <Form.Item label={<Space size={6}><CalendarOutlined />Thời gian</Space>} required>
                        <DatePicker
                            showTime={{ format: "HH:mm", minuteStep: 5 }}
                            style={{ width: "100%" }}
                            format="HH:mm DD/MM/YYYY"
                            placeholder="Chọn thời điểm"
                            value={start}
                            onChange={setStart}
                        />
                    </Form.Item>
                    <Form.Item label={<Space size={6}><ClockCircleOutlined />Thời lượng</Space>} required>
                        <InputNumber
                            style={{ width: "100%" }}
                            min={5}
                            step={15}
                            addonAfter="phút"
                            value={durationMinutes}
                            onChange={(v) => setDurationMinutes(v ?? 60)}
                        />
                    </Form.Item>
                </div>

                <Form.Item label={<Space size={6}><TeamOutlined />Người phỏng vấn</Space>} required>
                    <Select
                        mode="multiple"
                        placeholder="Chọn người phỏng vấn..."
                        value={interviewerIds}
                        onChange={setInterviewerIds}
                        options={interviewers.map((u) => ({ value: u.id, label: u.fullName }))}
                    />
                </Form.Item>

                {conflicts.length > 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        title="Người phỏng vấn đã có lịch trùng khung giờ này"
                        description={
                            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                                {conflicts.map((c) => (
                                    <li key={c.interviewId} style={{ fontSize: 13 }}>
                                        {describeConflict(c)}
                                    </li>
                                ))}
                            </ul>
                        }
                        style={{ marginBottom: 16, borderRadius: RADIUS.md }}
                    />
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Form.Item label="Hình thức">
                        <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
                            <Radio.Button value="OFFLINE">
                                <EnvironmentOutlined style={{ marginRight: 6 }} />Offline
                            </Radio.Button>
                            <Radio.Button value="ONLINE">
                                <VideoCameraOutlined style={{ marginRight: 6 }} />Online
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {format === "ONLINE" ? (
                        <Form.Item label="Link họp" required>
                            <Input
                                prefix={<VideoCameraOutlined style={{ color: "#9CA3AF" }} />}
                                placeholder="https://meet.google.com/..."
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                            />
                        </Form.Item>
                    ) : (
                        <Form.Item label="Địa điểm" required>
                            <Select
                                placeholder="Chọn địa điểm phỏng vấn"
                                value={workLocationId}
                                onChange={setWorkLocationId}
                                options={workLocations.map((w) => ({ value: w.id, label: String(w.name) }))}
                            />
                        </Form.Item>
                    )}
                </div>

                <Form.Item label="Ghi chú" style={{ marginBottom: 0 }}>
                    <Input.TextArea
                        rows={2}
                        placeholder="Ghi chú thêm cho buổi phỏng vấn (không bắt buộc)..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
