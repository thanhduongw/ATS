import { useEffect, useState } from "react";
import {
  Modal,
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
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { ApiMessageResponse, InterviewResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import EvaluationSummaryModal from "./EvaluationSummaryModal";
import { COLORS } from "../../../app/theme";

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

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>{value ?? "—"}</div>
    </div>
  );
}

export default function InterviewDetailModal({
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
  const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    getCatalogItems("/masterdata/work-locations").then((res) => {
      setWorkLocationMap(Object.fromEntries(res.data.map((w) => [w.id, String(w.name)])));
    });
  }, [open]);

  if (!interview) return null;

  const workLocationName = interview.workLocationId ? workLocationMap[interview.workLocationId] ?? "—" : "—";

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

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>{interview.candidateName}</span>
          <Tag color={STATUS_COLOR[interview.status] ?? "default"} style={{ margin: 0 }}>
            {STATUS_LABEL[interview.status] ?? interview.status}
          </Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={680}
      destroyOnHidden
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      footer={
        <Space wrap>
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
          {!isCandidate && (
            <Button onClick={() => setSummaryOpen(true)}>
              Xem tổng hợp đánh giá
            </Button>
          )}
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
          <Button onClick={onClose}>Đóng</Button>
        </Space>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          rowGap: 14,
          columnGap: 16,
          padding: "14px 16px",
          background: "#FAFBFC",
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <InfoField label="Thời gian" value={dayjs(interview.scheduledAt).format("HH:mm DD/MM/YYYY")} />
        <InfoField label="Thời lượng" value={`${interview.durationMinutes} phút`} />
        <InfoField label="Hình thức" value={interview.format === "ONLINE" ? "Online" : "Offline"} />
        {interview.format === "ONLINE" ? (
          <InfoField
            label="Link họp"
            value={
              <a href={interview.meetingLink ?? "#"} target="_blank" rel="noopener noreferrer">
                {interview.meetingLink}
              </a>
            }
          />
        ) : (
          <InfoField label="Địa điểm" value={workLocationName} />
        )}
        <InfoField
          label="Ứng viên xác nhận"
          value={interview.candidateConfirmed || interview.status === "CONFIRMED" ? "Đã xác nhận" : "Chưa xác nhận"}
        />
        <InfoField label="Ghi chú" value={interview.note} />
      </div>

      <List
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

      <EvaluationSummaryModal
        open={summaryOpen}
        interviewId={interview.id}
        onClose={() => setSummaryOpen(false)}
      />
    </Modal>
  );
}
