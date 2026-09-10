import { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Button,
    Form,
    Select,
    Radio,
    DatePicker,
    InputNumber,
    Input,
    Checkbox,
    Space,
    Alert,
    Tag,
    Empty,
    App,
} from "antd";
import {
    ThunderboltOutlined,
    ApartmentOutlined,
    TeamOutlined,
    UserOutlined,
    VideoCameraOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    CheckCircleFilled,
    ScheduleOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { AxiosError } from "axios";

import { getPostings } from "../../recruitment/recruitmentApi";
import { getApplications } from "../../candidate/applicationApi";
import { getUserDirectory } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { bulkScheduleInterviews, getInterviews } from "../interviewApi";
import type { JobPostingResponse } from "../../recruitment/types";
import type { ApplicationResponse } from "../../candidate/types";
import type { UserDirectoryResponse } from "../../auth/types";
import type { CatalogItem } from "../../masterdata/types";
import type {
    ApiMessageResponse,
    InterviewBulkScheduleItem,
    InterviewFormat,
    InterviewResponse,
} from "../types";
import { isSchedulable } from "../scheduleEligibility";
import { findInterviewerConflicts, describeConflict } from "../conflicts";
import { toLocalDateTimeString } from "../../../app/datetime";
import { COLORS, RADIUS } from "../../../app/theme";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkScheduleModal({ open, onClose, onSuccess }: Props) {
    const { message } = App.useApp();

    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [postingId, setPostingId] = useState<number | undefined>(undefined);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [selectedApplicationIds, setSelectedApplicationIds] = useState<number[]>([]);

    const [interviewers, setInterviewers] = useState<UserDirectoryResponse[]>([]);
    const [interviewerIds, setInterviewerIds] = useState<number[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [existingInterviews, setExistingInterviews] = useState<InterviewResponse[]>([]);

    const [format, setFormat] = useState<InterviewFormat>("OFFLINE");
    const [workLocationId, setWorkLocationId] = useState<number | undefined>(undefined);
    const [meetingLink, setMeetingLink] = useState("");
    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [note, setNote] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState<InterviewBulkScheduleItem[] | null>(null);

    const reset = () => {
        setDepartmentId(undefined);
        setPostingId(undefined);
        setApplications([]);
        setSelectedApplicationIds([]);
        setInterviewerIds([]);
        setFormat("OFFLINE");
        setWorkLocationId(undefined);
        setMeetingLink("");
        setStartTime(null);
        setDurationMinutes(15);
        setNote("");
        setResults(null);
    };

    useEffect(() => {
        if (!open) return;
        reset();
        getPostings({ size: 100 }).then((r) => setPostings(r.data.content));
        getUserDirectory("HIRING_MANAGER").then((r) => setInterviewers(r.data));
        getCatalogItems("/masterdata/work-locations").then((r) => setWorkLocations(r.data));
        getCatalogItems("/masterdata/departments").then((r) => setDepartments(r.data));
        getInterviews().then((r) => setExistingInterviews(r.data)).catch(() => setExistingInterviews([]));
    }, [open]);

    useEffect(() => {
        if (!postingId) {
            setApplications([]);
            setSelectedApplicationIds([]);
            return;
        }
        setApplicationsLoading(true);
        getApplications({ jobPostingId: postingId, size: 200 })
            .then((r) => {
                setApplications(r.data.content);
                setSelectedApplicationIds([]);
            })
            .finally(() => setApplicationsLoading(false));
    }, [postingId]);

    const departmentNameById = useMemo(() => {
        const map = new Map<number, string>();
        departments.forEach((d) => map.set(d.id, String(d.name)));
        return map;
    }, [departments]);

    /** Chi liet ke phong ban thuc su co tin tuyen dung, tranh chon vao roi khong co gi. */
    const departmentOptions = useMemo(() => {
        const seen = new Map<number, string>();
        postings.forEach((p) => {
            if (p.departmentId == null) return;
            seen.set(p.departmentId, p.departmentName ?? departmentNameById.get(p.departmentId) ?? `Phòng ban #${p.departmentId}`);
        });
        return [...seen.entries()]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [postings, departmentNameById]);

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

    const postingsInDepartment = useMemo(
        () => (departmentId ? postings.filter((p) => p.departmentId === departmentId) : []),
        [postings, departmentId],
    );

    const eligibleApplications = useMemo(() => applications.filter(isSchedulable), [applications]);

    const allEligibleSelected =
        eligibleApplications.length > 0 && selectedApplicationIds.length === eligibleApplications.length;
    const someEligibleSelected =
        selectedApplicationIds.length > 0 && !allEligibleSelected;

    const selectedApplications = useMemo(
        () => eligibleApplications.filter((a) => selectedApplicationIds.includes(a.id)),
        [eligibleApplications, selectedApplicationIds],
    );

    const previewSlots = useMemo(() => {
        if (!startTime || selectedApplications.length === 0) return [];
        let cursor = startTime;
        return selectedApplications.map((a) => {
            const slotStart = cursor;
            cursor = cursor.add(durationMinutes, "minute");
            return { application: a, start: slotStart, end: cursor };
        });
    }, [startTime, selectedApplications, durationMinutes]);

    /** Xung đột trên toàn bộ dải khung giờ dự kiến — backend sẽ tự dời, ở đây báo trước cho HR biết. */
    const conflicts = useMemo(() => {
        const seen = new Set<number>();
        return previewSlots
            .flatMap(({ start }) =>
                findInterviewerConflicts(existingInterviews, interviewerIds, start, durationMinutes),
            )
            .filter((c) => {
                if (seen.has(c.interviewId)) return false;
                seen.add(c.interviewId);
                return true;
            });
    }, [previewSlots, existingInterviews, interviewerIds, durationMinutes]);

    const toggleAllApplications = (checked: boolean) => {
        setSelectedApplicationIds(checked ? eligibleApplications.map((a) => a.id) : []);
    };

    const toggleApplication = (id: number, checked: boolean) => {
        setSelectedApplicationIds((prev) =>
            checked ? [...prev, id] : prev.filter((x) => x !== id),
        );
    };

    const canSubmit =
        selectedApplicationIds.length > 0 &&
        interviewerIds.length > 0 &&
        !!startTime &&
        durationMinutes > 0 &&
        (format === "ONLINE" ? meetingLink.trim().length > 0 : !!workLocationId);

    const handleSubmit = async () => {
        if (!canSubmit || !startTime) return;
        setSubmitting(true);
        try {
            const res = await bulkScheduleInterviews({
                applicationIds: selectedApplicationIds,
                startTime: toLocalDateTimeString(startTime),
                durationMinutesPerPerson: durationMinutes,
                format,
                workLocationId: format === "OFFLINE" ? workLocationId : null,
                meetingLink: format === "ONLINE" ? meetingLink : null,
                interviewerIds,
                note: note || null,
            });
            setResults(res.data);
            message.success(`Đã xếp lịch cho ${res.data.length} ứng viên`);
            onSuccess();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Xếp lịch hàng loạt thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal
            title={
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: `${COLORS.primary}1A`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: COLORS.primary,
                            fontSize: 15,
                        }}
                    >
                        <ThunderboltOutlined />
                    </span>
                    Xếp lịch hàng loạt
                </span>
            }
            open={open}
            onCancel={handleClose}
            width={760}
            destroyOnHidden
            footer={
                results ? (
                    <Button type="primary" onClick={handleClose}>
                        Xong
                    </Button>
                ) : (
                    [
                        <Button key="cancel" onClick={handleClose} disabled={submitting}>
                            Hủy
                        </Button>,
                        <Button
                            key="submit"
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            loading={submitting}
                            disabled={!canSubmit}
                            onClick={handleSubmit}
                        >
                            Xếp lịch cho {selectedApplicationIds.length || 0} ứng viên
                        </Button>,
                    ]
                )
            }
        >
            {results ? (
                <div>
                    <Alert
                        type="success"
                        showIcon
                        title="Đã xếp lịch phỏng vấn thành công"
                        description="Hệ thống đã tự động chia khung giờ nối tiếp nhau; những khung giờ trùng lịch của người phỏng vấn đã được tự động dời sang thời điểm rảnh kế tiếp."
                        style={{ marginBottom: 16, borderRadius: RADIUS.md }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {results.map((item) => (
                            <div
                                key={item.applicationId}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 14px",
                                    border: `1px solid ${COLORS.borderLight}`,
                                    borderRadius: RADIUS.md,
                                    background: "#FAFBFC",
                                }}
                            >
                                <Space>
                                    <CheckCircleFilled style={{ color: COLORS.success }} />
                                    <span style={{ fontWeight: 600 }}>{item.candidateName}</span>
                                </Space>
                                <Space>
                                    <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>
                                        {dayjs(item.scheduledAt).format("HH:mm")} –{" "}
                                        {dayjs(item.scheduledAt).add(item.durationMinutes, "minute").format("HH:mm")}
                                    </span>
                                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                                        {dayjs(item.scheduledAt).format("DD/MM/YYYY")}
                                    </span>
                                    {item.shifted && (
                                        <Tag color="gold" style={{ margin: 0 }}>
                                            Đã dời do trùng lịch
                                        </Tag>
                                    )}
                                </Space>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <Form layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item label={<Space><ApartmentOutlined />Phòng ban</Space>}>
                        <Select
                            placeholder="Chọn phòng ban"
                            value={departmentId}
                            onChange={(value) => {
                                setDepartmentId(value);
                                setPostingId(undefined);
                            }}
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={departmentOptions}
                            notFoundContent="Chưa có phòng ban nào đang có tin tuyển dụng"
                        />
                    </Form.Item>

                    <Form.Item label={<Space><TeamOutlined />Tin tuyển dụng</Space>}>
                        <Select
                            placeholder={
                                departmentId
                                    ? "Chọn tin tuyển dụng để lấy danh sách ứng viên"
                                    : "Chọn phòng ban trước"
                            }
                            disabled={!departmentId}
                            value={postingId}
                            onChange={setPostingId}
                            showSearch
                            optionFilterProp="label"
                            options={postingsInDepartment.map((p) => ({ value: p.id, label: p.title }))}
                            notFoundContent="Phòng ban này chưa có tin tuyển dụng nào"
                        />
                    </Form.Item>

                    {postingId && (
                        <Form.Item label={<Space><UserOutlined />Chọn ứng viên (theo thứ tự xếp lịch)</Space>}>
                            {!applicationsLoading && eligibleApplications.length === 0 ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Không có hồ sơ nào đã qua Sàng lọc CV và chưa kết thúc"
                                />
                            ) : (
                                <div
                                    style={{
                                        maxHeight: 220,
                                        overflowY: "auto",
                                        border: `1px solid ${COLORS.borderLight}`,
                                        borderRadius: RADIUS.md,
                                        padding: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "6px 8px",
                                            borderBottom: `1px solid ${COLORS.borderLight}`,
                                            marginBottom: 4,
                                        }}
                                    >
                                        <Checkbox
                                            checked={allEligibleSelected}
                                            indeterminate={someEligibleSelected}
                                            onChange={(e) => toggleAllApplications(e.target.checked)}
                                        >
                                            <span style={{ fontWeight: 600 }}>Chọn tất cả</span>
                                        </Checkbox>
                                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                                            Đã chọn {selectedApplicationIds.length}/{eligibleApplications.length}
                                        </span>
                                    </div>
                                    {eligibleApplications.map((a) => (
                                        <div
                                            key={a.id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "6px 8px",
                                            }}
                                        >
                                            <Checkbox
                                                checked={selectedApplicationIds.includes(a.id)}
                                                onChange={(e) => toggleApplication(a.id, e.target.checked)}
                                            >
                                                {a.candidateName}
                                            </Checkbox>
                                            <Tag style={{ margin: 0 }}>{a.currentStageName}</Tag>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Form.Item>
                    )}

                    <Form.Item label={<Space><TeamOutlined />Người phỏng vấn</Space>}>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Form.Item label="Hình thức phỏng vấn">
                            <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
                                <Radio.Button value="ONLINE"><VideoCameraOutlined style={{ marginRight: 6 }} />Online</Radio.Button>
                                <Radio.Button value="OFFLINE"><EnvironmentOutlined style={{ marginRight: 6 }} />Offline</Radio.Button>
                            </Radio.Group>
                        </Form.Item>

                        {format === "ONLINE" ? (
                            <Form.Item label="Link họp trực tuyến" required>
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

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                        <Form.Item label="Thời gian bắt đầu" required>
                            <DatePicker
                                showTime
                                style={{ width: "100%" }}
                                format="HH:mm DD/MM/YYYY"
                                placeholder="Chọn thời điểm bắt đầu"
                                value={startTime}
                                onChange={setStartTime}
                            />
                        </Form.Item>
                        <Form.Item label={<Space><ClockCircleOutlined />Thời lượng / người</Space>} required>
                            <InputNumber
                                style={{ width: "100%" }}
                                min={5}
                                step={5}
                                addonAfter="phút"
                                value={durationMinutes}
                                onChange={(v) => setDurationMinutes(v ?? 15)}
                            />
                        </Form.Item>
                    </div>

                    {previewSlots.length > 0 && (
                        <div
                            style={{
                                border: `1px solid ${COLORS.primary}25`,
                                borderRadius: RADIUS.md,
                                padding: 12,
                                background: `${COLORS.primary}08`,
                                marginBottom: 16,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 700, color: COLORS.primaryDark, textTransform: "uppercase" }}>
                                <ScheduleOutlined /> Dự kiến khung giờ (hệ thống sẽ tự dời nếu trùng lịch)
                            </div>
                            <Space wrap size={[8, 8]}>
                                {previewSlots.map(({ application, start, end }) => (
                                    <Tag key={application.id} style={{ margin: 0, padding: "4px 8px" }}>
                                        {application.candidateName}: {start.format("HH:mm")}–{end.format("HH:mm")}
                                    </Tag>
                                ))}
                            </Space>
                        </div>
                    )}

                    {conflicts.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            title={`Có ${conflicts.length} buổi phỏng vấn trùng giờ trong dải khung giờ này`}
                            description={
                                <>
                                    <div style={{ marginBottom: 4 }}>
                                        Hệ thống sẽ tự động dời các ca bị trùng sang khung giờ rảnh kế tiếp.
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                        {conflicts.map((c) => (
                                            <li key={c.interviewId} style={{ fontSize: 13 }}>
                                                {describeConflict(c)}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            }
                            style={{ marginBottom: 16, borderRadius: RADIUS.md }}
                        />
                    )}

                    <Form.Item label="Ghi chú">
                        <Input.TextArea
                            rows={2}
                            placeholder="Ghi chú thêm (không bắt buộc)..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </Form.Item>
                </Form>
            )}
        </Modal>
    );
}
