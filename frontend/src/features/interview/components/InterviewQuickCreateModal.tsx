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
    Tag,
    App,
} from "antd";
import {
    ApartmentOutlined,
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

    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
    const [postingId, setPostingId] = useState<number | undefined>(undefined);
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

        setDepartmentId(undefined);
        setPostingId(undefined);
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
        getCatalogItems("/masterdata/departments").then((r) => setDepartments(r.data));
        getInterviews().then((r) => setExistingInterviews(r.data)).catch(() => setExistingInterviews([]));
    }, [open, defaultStart, lockedApplicationId]);

    const schedulableApplications = useMemo(
        () => applications.filter(isSchedulable),
        [applications],
    );

    const departmentNameById = useMemo(() => {
        const map = new Map<number, string>();
        departments.forEach((d) => map.set(d.id, String(d.name)));
        return map;
    }, [departments]);

    /** Chi liet ke phong ban thuc su co ho so xep lich duoc. */
    const departmentOptions = useMemo(() => {
        const seen = new Map<number, string>();
        schedulableApplications.forEach((a) => {
            if (a.departmentId == null) return;
            seen.set(
                a.departmentId,
                a.departmentName ?? departmentNameById.get(a.departmentId) ?? `Phòng ban #${a.departmentId}`,
            );
        });
        return [...seen.entries()]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [schedulableApplications, departmentNameById]);

    /** Tin tuyen dung trong phong ban da chon, suy ra tu chinh cac ho so dang co. */
    const postingOptions = useMemo(() => {
        if (!departmentId) return [];
        const seen = new Map<number, string>();
        schedulableApplications
            .filter((a) => a.departmentId === departmentId)
            .forEach((a) => {
                seen.set(a.jobPostingId, a.jobPostingTitle ?? a.jobTitle ?? `Tin #${a.jobPostingId}`);
            });
        return [...seen.entries()]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [schedulableApplications, departmentId]);

    /** Khi mo tu trang chi tiet ho so thi ho so da khoa san, khong loc theo phong ban/tin dang. */
    const applicationOptions = useMemo(() => {
        const source = lockedApplicationId
            ? schedulableApplications
            : postingId
              ? schedulableApplications.filter((a) => a.jobPostingId === postingId)
              : [];
        return source.map((a) => ({ value: a.id, label: applicationOptionLabel(a) }));
    }, [schedulableApplications, postingId, lockedApplicationId]);

    /** Label gop ten + phong ban: the da chon va o tim kiem deu thay duoc phong ban. */
    const interviewerOptions = useMemo(
        () =>
            interviewers.map((u) => {
                const departmentName = u.departmentId != null ? departmentNameById.get(u.departmentId) : undefined;
                return {
                    value: u.id,
                    fullName: u.fullName,
                    departmentName,
                    label: departmentName ? `${u.fullName} — ${departmentName}` : u.fullName,
                };
            }),
        [interviewers, departmentNameById],
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
            width={760}
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
                {!lockedApplicationId && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Form.Item label={<Space size={6}><ApartmentOutlined />Phòng ban</Space>}>
                            <Select
                                showSearch
                                allowClear
                                optionFilterProp="label"
                                placeholder="Chọn phòng ban"
                                value={departmentId}
                                onChange={(value) => {
                                    setDepartmentId(value);
                                    setPostingId(undefined);
                                    setApplicationId(undefined);
                                }}
                                options={departmentOptions}
                                notFoundContent="Chưa có phòng ban nào có hồ sơ xếp lịch được"
                            />
                        </Form.Item>
                        <Form.Item label={<Space size={6}><TeamOutlined />Tin tuyển dụng</Space>}>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder={departmentId ? "Chọn tin tuyển dụng" : "Chọn phòng ban trước"}
                                disabled={!departmentId}
                                value={postingId}
                                onChange={(value) => {
                                    setPostingId(value);
                                    setApplicationId(undefined);
                                }}
                                options={postingOptions}
                                notFoundContent="Phòng ban này chưa có tin tuyển dụng nào"
                            />
                        </Form.Item>
                    </div>
                )}

                <Form.Item label={<Space size={6}><UserOutlined />Ứng viên</Space>} required>
                    <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder={
                            lockedApplicationId || postingId
                                ? "Chọn hồ sơ ứng tuyển"
                                : "Chọn tin tuyển dụng trước"
                        }
                        disabled={!!lockedApplicationId || (!lockedApplicationId && !postingId)}
                        value={applicationId}
                        onChange={setApplicationId}
                        options={applicationOptions}
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
                        showSearch
                        optionFilterProp="label"
                        options={interviewerOptions}
                        optionRender={(option) => (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                }}
                            >
                                <span>{option.data.fullName}</span>
                                {option.data.departmentName && (
                                    <Tag style={{ margin: 0 }}>{option.data.departmentName}</Tag>
                                )}
                            </div>
                        )}
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
                                <EnvironmentOutlined style={{ marginRight: 6 }} />Trực tiếp
                            </Radio.Button>
                            <Radio.Button value="ONLINE">
                                <VideoCameraOutlined style={{ marginRight: 6 }} />Trực tuyến
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {format === "ONLINE" ? (
                        <Form.Item label="Đường dẫn họp" required>
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
