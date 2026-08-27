import { useEffect, useState } from "react";
import { Modal, Tag, Button, Space, Popconfirm, Dropdown, App } from "antd";
import {
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
} from "@ant-design/icons";
import type { MenuProps } from "antd";
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
import { interviewStatusMeta } from "../interviewStatus";
import { SectionHeader, SectionContainer, InfoField, TextBlock } from "../../../components/ui/sectionKit";
import { COLORS, RADIUS } from "../../../app/theme";

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
  const { message } = App.useApp();
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

  const meta = interviewStatusMeta(interview.status);
  const start = dayjs(interview.scheduledAt);
  const end = start.add(interview.durationMinutes ?? 60, "minute");
  const workLocationName = interview.workLocationId
    ? workLocationMap[interview.workLocationId] ?? "—"
    : "—";
  const confirmed = interview.candidateConfirmed || interview.status === "CONFIRMED";

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
    // Không dùng dayjs UTC plugin (chưa cài) — tự format từ Date.toISOString() (đã là UTC)
    const fmt = (d: dayjs.Dayjs) => d.toDate().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const details =
      interview.format === "ONLINE" && interview.meetingLink
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

  const calendarMenuItems: MenuProps["items"] = [
    { key: "ics", icon: <DownloadOutlined />, label: "Tải file .ics", onClick: handleDownloadIcs },
    {
      key: "google",
      icon: <GoogleOutlined />,
      label: (
        <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
          Google Calendar
        </a>
      ),
    },
  ];

  const canConfirm =
    isCandidate && (interview.status === "SCHEDULED" || interview.candidateConfirmed === false);
  const canCancel = isHr && (interview.status === "SCHEDULED" || interview.status === "CONFIRMED");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={720}
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
              <Tag color={meta.tag} style={{ margin: 0 }}>
                {meta.label}
              </Tag>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              {start.format("HH:mm")} – {end.format("HH:mm")} · {start.format("dddd, DD/MM/YYYY")}
            </div>
          </div>
        </div>
      }
      styles={{
        body: { maxHeight: "68vh", overflowY: "auto", padding: 12, background: "#FAFBFC" },
        footer: { padding: 12, borderTop: `1px solid ${COLORS.borderLight}` },
      }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            {canCancel && (
              <Popconfirm
                title="Hủy lịch phỏng vấn này?"
                description="Các bên liên quan sẽ nhận được thông báo."
                onConfirm={handleCancel}
                okText="Hủy lịch"
                cancelText="Đóng"
                okButtonProps={{ danger: true }}
              >
                <Button danger type="text">
                  Hủy lịch
                </Button>
              </Popconfirm>
            )}
          </div>

          <Space wrap>
            <Dropdown menu={{ items: calendarMenuItems }}>
              <Button icon={<CalendarOutlined />}>Thêm vào lịch</Button>
            </Dropdown>
            {!isCandidate && <Button onClick={() => setSummaryOpen(true)}>Xem tổng hợp đánh giá</Button>}
            {canConfirm && (
              <Button type="primary" icon={<CheckCircleOutlined />} loading={confirming} onClick={handleConfirm}>
                Xác nhận lịch
              </Button>
            )}
            <Button onClick={onClose}>Đóng</Button>
          </Space>
        </div>
      }
    >
      {/* ── Lịch hẹn ─────────────────────────────── */}
      <SectionContainer>
        <SectionHeader
          icon={<ClockCircleOutlined />}
          title="Lịch hẹn"
          subtitle="Thời gian, hình thức và địa điểm phỏng vấn"
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <InfoField
            icon={<CalendarOutlined />}
            label="Thời gian"
            value={`${start.format("HH:mm")} – ${end.format("HH:mm")}`}
          />
          <InfoField label="Ngày" value={start.format("DD/MM/YYYY")} />
          <InfoField label="Thời lượng" value={`${interview.durationMinutes} phút`} />
          <InfoField
            icon={interview.format === "ONLINE" ? <VideoCameraOutlined /> : <EnvironmentOutlined />}
            label="Hình thức"
            value={interview.format === "ONLINE" ? "Online" : "Offline"}
          />
          {interview.format === "ONLINE" ? (
            <InfoField
              icon={<LinkOutlined />}
              label="Link họp"
              value={
                interview.meetingLink ? (
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                    Mở link họp
                  </a>
                ) : (
                  "—"
                )
              }
            />
          ) : (
            <InfoField icon={<EnvironmentOutlined />} label="Địa điểm" value={workLocationName} />
          )}
          <InfoField
            label="Ứng viên xác nhận"
            value={
              <span style={{ color: confirmed ? COLORS.success : COLORS.warning }}>
                {confirmed ? "Đã xác nhận" : "Chưa xác nhận"}
              </span>
            }
          />
        </div>
      </SectionContainer>

      {/* ── Người phỏng vấn ──────────────────────── */}
      <SectionContainer>
        <SectionHeader
          icon={<TeamOutlined />}
          title="Người phỏng vấn"
          subtitle={`${interview.interviewers.filter((i) => i.evaluationSubmitted).length}/${interview.interviewers.length} người đã gửi đánh giá`}
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

      <EvaluationSummaryModal
        open={summaryOpen}
        interviewId={interview.id}
        onClose={() => setSummaryOpen(false)}
      />
    </Modal>
  );
}
