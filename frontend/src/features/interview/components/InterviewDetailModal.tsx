import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
} from "antd";
import {
  MoreOutlined,
  CalendarOutlined,
  GoogleOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  LinkOutlined,
  CloseCircleOutlined,
  EditOutlined,
  SwapOutlined,
  UserDeleteOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { AxiosError } from "axios";

import {
  approveHmProposal,
  cancelInterview,
  confirmInterview,
  confirmInterviewByHm,
  getInterviewIcs,
  getInterviews,
  markInterviewNoShow,
  rejectInterviewByHm,
  updateInterview,
} from "../interviewApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, InterviewFormat, InterviewResponse } from "../types";
import { INTERVIEW_CANCELLABLE, INTERVIEW_HELD, INTERVIEW_RESCHEDULABLE } from "../types";
import { describeConflict, findInterviewerConflicts } from "../conflicts";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import EvaluationSummaryModal from "./EvaluationSummaryModal";
import { interviewStatusMeta } from "../../../app/statusLabels";
import { SectionHeader, SectionContainer, InfoField, TextBlock } from "../../../components/ui/sectionKit";
import { COLORS, RADIUS } from "../../../app/theme";
import { toLocalDateTimeString } from "../../../app/datetime";

interface Props {
  open: boolean;
  interview: InterviewResponse | null;
  onClose: () => void;
  onChanged: () => void;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

export default function InterviewDetailModal({ open, interview, onClose, onChanged }: Props) {
  const { message, modal } = App.useApp();
  const currentUser = useAppSelector((state) => state.auth.user);
  const role = currentUser?.role as UserRole | undefined;
  const isHr = !!role && HR_ROLES.includes(role);
  const isCandidate = role === "CANDIDATE";

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
  const [existingInterviews, setExistingInterviews] = useState<InterviewResponse[] | null>(null);

  const [hmDecision, setHmDecision] = useState<"propose" | "reject" | null>(null);
  const [proposedAt, setProposedAt] = useState<Dayjs | null>(null);
  const [proposalNote, setProposalNote] = useState("");

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Dayjs | null>(null);
  const [updatedDuration, setUpdatedDuration] = useState(60);
  const [updatedFormat, setUpdatedFormat] = useState<InterviewFormat>("OFFLINE");
  const [updatedWorkLocationId, setUpdatedWorkLocationId] = useState<number | undefined>();
  const [updatedMeetingLink, setUpdatedMeetingLink] = useState("");
  const [updatedNote, setUpdatedNote] = useState("");

  useEffect(() => {
    if (!open) return;
    getCatalogItems("/masterdata/work-locations").then((res) => {
      setWorkLocations(res.data);
    }).catch(() => {
      setWorkLocations([]);
      message.error("Không tải được danh sách địa điểm phỏng vấn");
    });
    if (!isCandidate) {
      getInterviews()
        .then((res) => setExistingInterviews(res.data))
        .catch(() => setExistingInterviews(null));
    }
  }, [open, isCandidate, message]);

  if (!interview) return null;

  const meta = interviewStatusMeta(interview.status, isCandidate ? "candidate" : "internal");
  const start = dayjs(interview.scheduledAt);
  const end = start.add(interview.durationMinutes ?? 60, "minute");
  const workLocationMap = Object.fromEntries(
    workLocations.map((location) => [location.id, String(location.name)]),
  );
  const workLocationName = interview.workLocationId
    ? workLocationMap[interview.workLocationId] ?? "—"
    : "—";
  const isAssignedHm =
    role === "HIRING_MANAGER" &&
    interview.interviewers.some((person) => String(person.interviewerId) === currentUser?.userId);
  const evaluationDone = interview.interviewers.filter((person) => person.evaluationSubmitted).length;
  const showEvaluationProgress =
    INTERVIEW_HELD.has(interview.status) && interview.interviewers.length >= 2;

  const updateConflicts = findInterviewerConflicts(
    existingInterviews ?? [],
    interview.interviewers.map((person) => person.interviewerId),
    updatedAt,
    updatedDuration,
    interview.id,
  );
  const proposalConflicts = findInterviewerConflicts(
    existingInterviews ?? [],
    interview.interviewers.map((person) => person.interviewerId),
    interview.proposedScheduledAt ? dayjs(interview.proposedScheduledAt) : null,
    interview.durationMinutes ?? 60,
    interview.id,
  );
  const conflictCheckUnavailable = existingInterviews == null;

  const errorMessage = (err: unknown, fallback: string) => {
    const axiosErr = err as AxiosError<ApiMessageResponse>;
    message.error(axiosErr.response?.data?.message ?? fallback);
  };

  const finishAction = () => {
    onChanged();
    onClose();
  };

  const handleCancel = async () => {
    setActiveAction("cancel");
    try {
      await cancelInterview(interview.id);
      message.success("Đã hủy lịch phỏng vấn");
      finishAction();
    } catch (err) {
      errorMessage(err, "Hủy lịch thất bại");
    } finally {
      setActiveAction(null);
    }
  };

  const handleConfirm = async () => {
    setActiveAction("candidate-confirm");
    try {
      await confirmInterview(interview.id);
      message.success("Đã xác nhận lịch phỏng vấn");
      finishAction();
    } catch (err) {
      errorMessage(err, "Xác nhận thất bại");
    } finally {
      setActiveAction(null);
    }
  };

  const handleHmConfirm = async () => {
    setActiveAction("hm-confirm");
    try {
      await confirmInterviewByHm(interview.id);
      message.success("Đã chốt giờ phỏng vấn và thông báo cho ứng viên");
      finishAction();
    } catch (err) {
      errorMessage(err, "Xác nhận lịch thất bại");
    } finally {
      setActiveAction(null);
    }
  };

  const openHmDecision = (decision: "propose" | "reject") => {
    setHmDecision(decision);
    setProposedAt(null);
    setProposalNote("");
  };

  const handleHmReject = async () => {
    if (hmDecision === "propose" && !proposedAt) {
      message.warning("Vui lòng chọn giờ đề xuất");
      return;
    }
    if (hmDecision === "propose" && proposedAt && !proposedAt.isAfter(dayjs())) {
      message.warning("Giờ đề xuất phải nằm trong tương lai");
      return;
    }
    if (hmDecision === "propose" && proposedAt && proposedAt.isSame(start, "minute")) {
      message.warning("Giờ đề xuất phải khác giờ hiện tại");
      return;
    }
    setActiveAction("hm-reject");
    try {
      await rejectInterviewByHm(interview.id, {
        proposedScheduledAt:
          hmDecision === "propose" && proposedAt ? toLocalDateTimeString(proposedAt) : null,
        note: proposalNote.trim() || null,
      });
      message.success(
        hmDecision === "propose" ? "Đã gửi giờ đề xuất cho bộ phận tuyển dụng" : "Đã từ chối lịch phỏng vấn",
      );
      setHmDecision(null);
      finishAction();
    } catch (err) {
      errorMessage(err, hmDecision === "propose" ? "Gửi đề xuất thất bại" : "Từ chối lịch thất bại");
    } finally {
      setActiveAction(null);
    }
  };

  const performApproveProposal = async () => {
    setActiveAction("approve-proposal");
    try {
      await approveHmProposal(interview.id);
      message.success("Đã duyệt giờ đề xuất và thông báo cho ứng viên");
      finishAction();
    } catch (err) {
      errorMessage(err, "Duyệt giờ đề xuất thất bại");
    } finally {
      setActiveAction(null);
    }
  };

  const handleApproveProposal = () => {
    if (!conflictCheckUnavailable && proposalConflicts.length === 0) {
      void performApproveProposal();
      return;
    }

    modal.confirm({
      title: "Xác nhận duyệt giờ đề xuất",
      icon: <WarningOutlined />,
      content: conflictCheckUnavailable ? (
        <div>Không tải được dữ liệu để kiểm tra trùng lịch. Bạn vẫn có thể duyệt nếu đã kiểm tra thủ công.</div>
      ) : (
        <div>
          <div style={{ marginBottom: 4 }}>Giờ đề xuất đang trùng lịch:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {proposalConflicts.map((conflict) => (
              <li key={conflict.interviewId}>{describeConflict(conflict)}</li>
            ))}
          </ul>
        </div>
      ),
      okText: "Vẫn duyệt",
      cancelText: "Kiểm tra lại",
      onOk: performApproveProposal,
    });
  };

  const handleNoShow = async () => {
    setActiveAction("no-show");
    try {
      await markInterviewNoShow(interview.id);
      message.success("Đã ghi nhận ứng viên vắng mặt");
      finishAction();
    } catch (err) {
      errorMessage(err, "Ghi nhận vắng mặt thất bại");
    } finally {
      setActiveAction(null);
    }
  };

  const openReschedule = () => {
    setUpdatedAt(start);
    setUpdatedDuration(interview.durationMinutes ?? 60);
    setUpdatedFormat(interview.format);
    setUpdatedWorkLocationId(interview.workLocationId ?? undefined);
    setUpdatedMeetingLink(interview.meetingLink ?? "");
    setUpdatedNote(interview.note ?? "");
    setRescheduleOpen(true);
  };

  const updatedAtError = updatedAt && !updatedAt.isAfter(dayjs())
    ? "Thời gian mới phải nằm trong tương lai"
    : updatedAt?.isSame(start, "minute")
      ? "Thời gian mới phải khác thời gian hiện tại"
      : null;
  const canSubmitUpdate =
    !!updatedAt &&
    !updatedAtError &&
    updatedDuration > 0 &&
    (updatedFormat === "ONLINE" ? updatedMeetingLink.trim().length > 0 : !!updatedWorkLocationId);

  const performUpdate = async () => {
    if (!updatedAt || !canSubmitUpdate) return;
    setActiveAction("update");
    try {
      await updateInterview(interview.id, {
        scheduledAt: toLocalDateTimeString(updatedAt),
        durationMinutes: updatedDuration,
        format: updatedFormat,
        workLocationId: updatedFormat === "OFFLINE" ? updatedWorkLocationId : null,
        meetingLink: updatedFormat === "ONLINE" ? updatedMeetingLink.trim() : null,
        note: updatedNote.trim() || null,
      });
      message.success("Đã cập nhật lịch phỏng vấn");
      setRescheduleOpen(false);
      finishAction();
    } catch (err) {
      errorMessage(err, "Cập nhật lịch thất bại");
    } finally {
      setActiveAction(null);
    }
  };

  const handleUpdate = () => {
    if (!canSubmitUpdate) return;
    const candidateMustConfirmAgain = interview.status === "CANDIDATE_CONFIRMED";
    if (!conflictCheckUnavailable && updateConflicts.length === 0 && !candidateMustConfirmAgain) {
      void performUpdate();
      return;
    }

    modal.confirm({
      title: "Xác nhận dời lịch phỏng vấn",
      icon: <WarningOutlined />,
      content: (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {candidateMustConfirmAgain && (
            <div>Ứng viên đã xác nhận giờ cũ và sẽ phải xác nhận lại lịch mới.</div>
          )}
          {conflictCheckUnavailable && (
            <div>Không tải được dữ liệu để kiểm tra trùng lịch. Chỉ tiếp tục nếu bạn đã kiểm tra thủ công.</div>
          )}
          {updateConflicts.length > 0 && (
            <div>
              <div style={{ marginBottom: 4 }}>Khung giờ mới đang trùng lịch:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {updateConflicts.map((conflict) => (
                  <li key={conflict.interviewId}>{describeConflict(conflict)}</li>
                ))}
              </ul>
            </div>
          )}
        </Space>
      ),
      okText: "Vẫn dời lịch",
      cancelText: "Kiểm tra lại",
      onOk: performUpdate,
    });
  };

  const handleDownloadIcs = async () => {
    try {
      const res = await getInterviewIcs(interview.id);
      saveAs(res.data, `phong-van-${interview.id}.ics`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được file lịch");
    }
  };

  const googleCalendarUrl = (() => {
    // Không dùng dayjs UTC plugin (chưa cài) — tự format từ Date.toISOString() (đã là UTC)
    const fmt = (d: dayjs.Dayjs) => d.toDate().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const details =
      interview.format === "ONLINE" && interview.meetingLink
        ? `Đường dẫn họp: ${interview.meetingLink}`
        : workLocationName;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Phỏng vấn — ${interview.candidateName}`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details,
      location: interview.format === "OFFLINE" ? workLocationName : (interview.meetingLink ?? ""),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  const canConfirm = isCandidate && interview.status === "HM_CONFIRMED";
  const canCancel = isHr && INTERVIEW_CANCELLABLE.has(interview.status);
  const canHmConfirm = isAssignedHm && interview.status === "SCHEDULED";
  const canApproveProposal = isHr && interview.status === "HM_RESCHEDULE_PROPOSED";
  const canMarkNoShow = isAssignedHm && INTERVIEW_HELD.has(interview.status);
  const canReschedule = isHr && INTERVIEW_RESCHEDULABLE.has(interview.status);

  // Trong menu không dùng được Popconfirm nên hai thao tác phá hủy hỏi lại bằng hộp thoại.
  const confirmCancel = () => modal.confirm({
    title: "Hủy lịch phỏng vấn này?",
    content: "Buổi phỏng vấn sẽ chuyển sang trạng thái Đã hủy.",
    okText: "Hủy lịch",
    cancelText: "Đóng",
    okButtonProps: { danger: true },
    onOk: handleCancel,
  });

  const confirmNoShow = () => modal.confirm({
    title: "Ghi nhận ứng viên vắng mặt?",
    content: "Sau thao tác này không thể nộp đánh giá cho buổi phỏng vấn.",
    okText: "Ghi nhận vắng mặt",
    cancelText: "Đóng",
    okButtonProps: { danger: true },
    onOk: handleNoShow,
  });

  /**
   * Chỉ hai nút quyết định được để ngoài chân modal. Tiện ích, thao tác của HR và
   * các thao tác phá hủy gom hết vào đây — trước kia sáu nút dàn hàng ngang khiến
   * không nhận ra đâu là việc cần làm tiếp.
   */
  const moreMenuItems: MenuProps["items"] = [
    { key: "ics", icon: <DownloadOutlined />, label: "Tải file .ics", onClick: handleDownloadIcs },
    {
      key: "google",
      icon: <GoogleOutlined />,
      label: (
        <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
          Mở trong Lịch Google
        </a>
      ),
    },
    // Chưa ai nộp thì mở ra chỉ thấy bảng rỗng.
    ...(!isCandidate && evaluationDone > 0
      ? [{
        key: "summary",
        icon: <FileTextOutlined />,
        label: "Xem tổng hợp đánh giá",
        onClick: () => setSummaryOpen(true),
      }]
      : []),
    ...(canReschedule
      ? [{ key: "reschedule", icon: <EditOutlined />, label: "Dời lịch", onClick: openReschedule }]
      : []),
    ...(canHmConfirm || canMarkNoShow || canCancel ? [{ type: "divider" as const }] : []),
    ...(canHmConfirm
      ? [{
        key: "reject",
        icon: <CloseCircleOutlined />,
        danger: true,
        label: "Từ chối lịch",
        onClick: () => openHmDecision("reject"),
      }]
      : []),
    ...(canMarkNoShow
      ? [{
        key: "no-show",
        icon: <UserDeleteOutlined />,
        danger: true,
        label: "Ghi nhận vắng mặt",
        onClick: confirmNoShow,
      }]
      : []),
    ...(canCancel
      ? [{
        key: "cancel",
        icon: <CloseCircleOutlined />,
        danger: true,
        label: "Hủy lịch",
        onClick: confirmCancel,
      }]
      : []),
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      destroyOnHidden
      centered
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: `${meta.accent}14`,
              color: meta.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initialsOf(interview.candidateName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
                {interview.candidateName}
              </span>
              <Tag color={meta.color} style={{ margin: 0 }}>
                {meta.label}
              </Tag>
            </div>
            <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
              {start.format("HH:mm")} – {end.format("HH:mm")} · {start.format("dddd, DD/MM/YYYY")}
            </div>
          </div>
        </div>
      }
      styles={{
        body: { maxHeight: "78vh", overflowY: "auto", padding: 12, background: "#FAFBFC" },
        footer: { padding: 12, borderTop: `1px solid ${COLORS.borderLight}` },
      }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác khác" />
          </Dropdown>

          <Space wrap>
            {canHmConfirm && (
              <Button
                icon={<SwapOutlined />}
                disabled={activeAction != null}
                onClick={() => openHmDecision("propose")}
              >
                Đề xuất đổi giờ
              </Button>
            )}
            {canApproveProposal && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={activeAction === "approve-proposal"}
                onClick={handleApproveProposal}
              >
                Duyệt giờ đề xuất
              </Button>
            )}
            {canHmConfirm && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={activeAction === "hm-confirm"}
                onClick={handleHmConfirm}
              >
                Xác nhận lịch
              </Button>
            )}
            {canConfirm && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={activeAction === "candidate-confirm"}
                onClick={handleConfirm}
              >
                Xác nhận lịch
              </Button>
            )}
          </Space>
        </div>

      }
    >
      {interview.status === "HM_RESCHEDULE_PROPOSED" && interview.proposedScheduledAt && (
        <SectionContainer>
          <SectionHeader
            icon={<SwapOutlined />}
            title="Đề xuất đổi giờ từ phòng ban"
            subtitle="Giờ đề xuất cần được bộ phận tuyển dụng duyệt trước khi thông báo cho ứng viên"
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <InfoField
              label="Giờ ban đầu"
              value={`${start.format("HH:mm")} · ${start.format("DD/MM/YYYY")}`}
            />
            <InfoField
              label="Giờ đề xuất"
              value={`${dayjs(interview.proposedScheduledAt).format("HH:mm")} · ${dayjs(
                interview.proposedScheduledAt,
              ).format("DD/MM/YYYY")}`}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <TextBlock label="Lý do đề xuất" value={interview.proposalNote || "Không có lý do kèm theo"} />
          </div>
          {conflictCheckUnavailable ? (
            <Alert
              type="warning"
              showIcon
              title="Chưa thể kiểm tra trùng lịch cho giờ đề xuất"
              style={{ marginTop: 12 }}
            />
          ) : proposalConflicts.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              title="Giờ đề xuất đang trùng lịch của người phỏng vấn"
              description={
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {proposalConflicts.map((conflict) => (
                    <li key={conflict.interviewId}>{describeConflict(conflict)}</li>
                  ))}
                </ul>
              }
              style={{ marginTop: 12 }}
            />
          ) : null}
        </SectionContainer>
      )}

      {/* ── Lịch hẹn ─────────────────────────────── */}
      <SectionContainer>
        {/* Giờ, ngày và trạng thái đã nằm ngay trên tiêu đề nên không nhắc lại ở đây. */}
        <SectionHeader icon={<ClockCircleOutlined />} title="Lịch hẹn" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <InfoField
            icon={<CalendarOutlined />}
            label="Thời lượng"
            value={`${interview.durationMinutes} phút`}
          />
          <InfoField
            icon={interview.format === "ONLINE" ? <VideoCameraOutlined /> : <EnvironmentOutlined />}
            label="Hình thức"
            value={interview.format === "ONLINE" ? "Trực tuyến" : "Trực tiếp"}
          />
          {interview.format === "ONLINE" ? (
            <InfoField
              icon={<LinkOutlined />}
              label="Đường dẫn họp"
              value={
                interview.meetingLink ? (
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                    Mở phòng họp
                  </a>
                ) : (
                  "—"
                )
              }
            />
          ) : (
            <InfoField icon={<EnvironmentOutlined />} label="Địa điểm" value={workLocationName} />
          )}
        </div>
      </SectionContainer>

      {/* ── Người phỏng vấn ──────────────────────── */}
      <SectionContainer>
        <SectionHeader
          icon={<TeamOutlined />}
          title="Người phỏng vấn"
          subtitle={
            showEvaluationProgress
              ? `${evaluationDone}/${interview.interviewers.length} đã đánh giá`
              : undefined
          }
        />

        {interview.interviewers.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>Chưa phân công người phỏng vấn</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {interview.interviewers.map((person) => (
              <div
                key={person.interviewerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: RADIUS.md,
                  background: "#FAFBFC",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `${COLORS.primary}14`,
                    color: COLORS.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initialsOf(person.fullName)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {person.fullName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: person.evaluationSubmitted ? COLORS.success : COLORS.textMuted,
                    }}
                  >
                    {person.evaluationSubmitted ? (
                      <>
                        <CheckCircleFilled /> Đã đánh giá
                      </>
                    ) : (
                      <>
                        <ClockCircleOutlined /> Chưa đánh giá
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionContainer>

      {/* ── Ghi chú ──────────────────────────────── */}
      {interview.note && (
        <SectionContainer style={{ marginBottom: 4 }}>
          <SectionHeader icon={<FileTextOutlined />} title="Ghi chú" />
          <TextBlock label="Ghi chú buổi phỏng vấn" value={interview.note} />
        </SectionContainer>
      )}

      <Modal
        open={hmDecision != null}
        onCancel={() => setHmDecision(null)}
        destroyOnHidden
        centered
        width={520}
        title={hmDecision === "propose" ? "Đề xuất đổi giờ phỏng vấn" : "Từ chối lịch phỏng vấn"}
        footer={[
          <Button key="close" disabled={activeAction === "hm-reject"} onClick={() => setHmDecision(null)}>
            Đóng
          </Button>,
          <Button
            key="submit"
            danger={hmDecision === "reject"}
            type="primary"
            icon={hmDecision === "propose" ? <SwapOutlined /> : <CloseCircleOutlined />}
            loading={activeAction === "hm-reject"}
            disabled={
              hmDecision === "propose" &&
              (!proposedAt || !proposedAt.isAfter(dayjs()) || proposedAt.isSame(start, "minute"))
            }
            onClick={handleHmReject}
          >
            {hmDecision === "propose" ? "Gửi giờ đề xuất" : "Xác nhận từ chối"}
          </Button>,
        ]}
      >
        {hmDecision === "reject" && (
          <Alert
            type="warning"
            showIcon
            title="Buổi phỏng vấn sẽ bị hủy ngay sau khi bạn xác nhận từ chối."
            style={{ marginBottom: 16 }}
          />
        )}
        <Form layout="vertical">
          {hmDecision === "propose" && (
            <Form.Item label="Giờ đề xuất" required>
              <DatePicker
                showTime={{ format: "HH:mm", minuteStep: 5 }}
                format="HH:mm DD/MM/YYYY"
                placeholder="Chọn thời điểm phù hợp"
                value={proposedAt}
                onChange={setProposedAt}
                disabledDate={(current) => current.endOf("day").isBefore(dayjs())}
                style={{ width: "100%" }}
              />
            </Form.Item>
          )}
          <Form.Item label="Lý do">
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              value={proposalNote}
              onChange={(event) => setProposalNote(event.target.value)}
              placeholder={
                hmDecision === "propose"
                  ? "Nêu lý do và thông tin cần lưu ý về giờ đề xuất"
                  : "Nêu lý do từ chối để bộ phận tuyển dụng nắm được"
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={rescheduleOpen}
        onCancel={() => setRescheduleOpen(false)}
        destroyOnHidden
        centered
        width={760}
        title="Dời lịch phỏng vấn"
        footer={[
          <Button key="close" disabled={activeAction === "update"} onClick={() => setRescheduleOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<EditOutlined />}
            loading={activeAction === "update"}
            disabled={!canSubmitUpdate}
            onClick={handleUpdate}
          >
            Lưu lịch mới
          </Button>,
        ]}
      >
        {interview.status === "CANDIDATE_CONFIRMED" && (
          <Alert
            type="warning"
            showIcon
            title="Ứng viên đã xác nhận lịch hiện tại"
            description="Khi dời lịch, ứng viên sẽ được thông báo và phải xác nhận lại giờ mới."
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <Form.Item
              label="Thời gian mới"
              required
              validateStatus={updatedAtError ? "error" : undefined}
              help={updatedAtError}
            >
              <DatePicker
                showTime={{ format: "HH:mm", minuteStep: 5 }}
                format="HH:mm DD/MM/YYYY"
                placeholder="Chọn thời điểm"
                value={updatedAt}
                onChange={setUpdatedAt}
                disabledDate={(current) => current.endOf("day").isBefore(dayjs())}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item label="Thời lượng" required>
              <InputNumber
                min={5}
                step={15}
                addonAfter="phút"
                value={updatedDuration}
                onChange={(value) => setUpdatedDuration(value ?? 60)}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>

          <Form.Item label="Hình thức" required>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={updatedFormat}
              onChange={(event) => setUpdatedFormat(event.target.value as InterviewFormat)}
            >
              <Radio.Button value="OFFLINE">Trực tiếp</Radio.Button>
              <Radio.Button value="ONLINE">Trực tuyến</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {updatedFormat === "OFFLINE" ? (
            <Form.Item label="Địa điểm" required>
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Chọn địa điểm phỏng vấn"
                value={updatedWorkLocationId}
                onChange={setUpdatedWorkLocationId}
                options={workLocations
                  .filter((location) => location.active !== false)
                  .map((location) => ({ value: location.id, label: String(location.name) }))}
              />
            </Form.Item>
          ) : (
            <Form.Item label="Đường dẫn họp" required>
              <Input
                prefix={<LinkOutlined />}
                placeholder="Nhập đường dẫn phòng họp trực tuyến"
                value={updatedMeetingLink}
                onChange={(event) => setUpdatedMeetingLink(event.target.value)}
              />
            </Form.Item>
          )}

          {updateConflicts.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title="Người phỏng vấn đang có lịch trùng khung giờ mới"
              description={
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {updateConflicts.map((conflict) => (
                    <li key={conflict.interviewId}>{describeConflict(conflict)}</li>
                  ))}
                </ul>
              }
              style={{ marginBottom: 16 }}
            />
          )}
          {conflictCheckUnavailable && (
            <Alert
              type="warning"
              showIcon
              title="Chưa thể kiểm tra trùng lịch"
              description="Bạn vẫn có thể lưu sau khi xác nhận đã kiểm tra lịch thủ công."
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item label="Ghi chú">
            <Input.TextArea
              rows={3}
              value={updatedNote}
              onChange={(event) => setUpdatedNote(event.target.value)}
              placeholder="Ghi chú thêm cho buổi phỏng vấn"
            />
          </Form.Item>
        </Form>
      </Modal>

      <EvaluationSummaryModal
        open={summaryOpen}
        interview={interview}
        onClose={() => setSummaryOpen(false)}
      />
    </Modal>
  );
}
