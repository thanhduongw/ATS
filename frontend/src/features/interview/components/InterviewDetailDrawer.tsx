import { useState } from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Button,
  Space,
  List,
  message,
  Popconfirm,
} from "antd";
import { CalendarOutlined, GoogleOutlined } from "@ant-design/icons";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { cancelInterview, confirmInterview, getInterviewIcs } from "../interviewApi";
import type { ApiMessageResponse, InterviewResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import EvaluationSummaryModal from "./EvaluationSummaryModal";

interface Props {
  open: boolean;
  interview: InterviewResponse | null;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Đã lên lịch",
  CONFIRMED: "Ứng viên đã xác nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "blue",
  CONFIRMED: "cyan",
  COMPLETED: "green",
  CANCELLED: "default",
};

export default function InterviewDetailDrawer({
  open,
  interview,
  onClose,
  onChanged,
}: Props) {
  const role = useAppSelector((state) => state.auth.user?.role) as UserRole | undefined;
  const isHr = !!role && HR_ROLES.includes(role);
  const isCandidate = role === "CANDIDATE";

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!interview) return null;

  const handleCancel = async () => {
    try {
      await cancelInterview(interview.id);
      message.success("Đã hủy lịch phỏng vấn");
      onChanged();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Hủy lịch thất bại");
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirmInterview(interview.id);
      message.success("Đã xác nhận lịch phỏng vấn");
      onChanged();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Xác nhận thất bại");
    } finally {
      setConfirming(false);
    }
  };

  const canConfirm =
    isCandidate &&
    (interview.status === "SCHEDULED" || interview.candidateConfirmed === false);

  const handleDownloadIcs = async () => {
    try {
      const res = await getInterviewIcs(interview.id);
      saveAs(res.data, `interview-${interview.id}.ics`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được file lịch");
    }
  };

  const googleCalendarUrl = (() => {
    const start = dayjs(interview.scheduledAt);
    const end = start.add(interview.durationMinutes ?? 60, "minute");
    // Không dùng dayjs UTC plugin (chưa cài) — tự format từ Date.toISOString() (đã là UTC)
    const fmt = (d: dayjs.Dayjs) => d.toDate().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const details = interview.format === "ONLINE" && interview.meetingLink
      ? `Link họp: ${interview.meetingLink}`
      : interview.location ?? "";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Phỏng vấn — ${interview.candidateName}`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details,
      location: interview.format === "OFFLINE" ? (interview.location ?? "") : (interview.meetingLink ?? ""),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  return (
    <Drawer
      title={interview.candidateName}
      open={open}
      onClose={onClose}
      width={480}
    >
      <Tag color={STATUS_COLOR[interview.status] ?? "default"} style={{ marginBottom: 16 }}>
        {STATUS_LABEL[interview.status] ?? interview.status}
      </Tag>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Thời gian">
          {dayjs(interview.scheduledAt).format("HH:mm DD/MM/YYYY")}
        </Descriptions.Item>
        <Descriptions.Item label="Thời lượng">
          {interview.durationMinutes} phút
        </Descriptions.Item>
        <Descriptions.Item label="Hình thức">
          {interview.format === "ONLINE" ? "Online" : "Offline"}
        </Descriptions.Item>
        {interview.format === "ONLINE" ? (
          <Descriptions.Item label="Link họp">
            <a
              href={interview.meetingLink ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              {interview.meetingLink}
            </a>
          </Descriptions.Item>
        ) : (
          <Descriptions.Item label="Địa điểm">
            {interview.location}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Ghi chú">
          {interview.note ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Ứng viên xác nhận">
          {interview.candidateConfirmed || interview.status === "CONFIRMED"
            ? "Đã xác nhận"
            : "Chưa xác nhận"}
        </Descriptions.Item>
      </Descriptions>

      <List
        style={{ marginTop: 16 }}
        header="Người phỏng vấn"
        bordered
        size="small"
        dataSource={interview.interviewers}
        renderItem={(item) => (
          <List.Item>
            {item.fullName}
            <Tag
              color={item.evaluationSubmitted ? "green" : "default"}
              style={{ marginLeft: 8 }}
            >
              {item.evaluationSubmitted ? "Đã đánh giá" : "Chưa đánh giá"}
            </Tag>
          </List.Item>
        )}
      />

      <Space style={{ marginTop: 24 }} wrap>
        <Button icon={<CalendarOutlined />} onClick={handleDownloadIcs}>
          Thêm vào Calendar
        </Button>
        <Button icon={<GoogleOutlined />} href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
          Google Calendar
        </Button>

        {canConfirm && (
          <Button type="primary" loading={confirming} onClick={handleConfirm}>
            Xác nhận lịch
          </Button>
        )}

        {/* Chỉ HR / Dept xem tổng hợp đánh giá — Candidate không */}
        {!isCandidate && (
          <Button onClick={() => setSummaryOpen(true)}>
            Xem tổng hợp đánh giá
          </Button>
        )}

        {/* Chỉ HR được hủy lịch */}
        {isHr &&
          (interview.status === "SCHEDULED" || interview.status === "CONFIRMED") && (
            <Popconfirm
              title="Hủy lịch phỏng vấn này?"
              onConfirm={handleCancel}
              okText="Hủy lịch"
              cancelText="Đóng"
            >
              <Button danger>Hủy lịch</Button>
            </Popconfirm>
          )}
      </Space>

      <EvaluationSummaryModal
        open={summaryOpen}
        interviewId={interview.id}
        onClose={() => setSummaryOpen(false)}
      />
    </Drawer>
  );
}